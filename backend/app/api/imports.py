import io
import uuid
from typing import List, Dict, Any, Optional
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.core.database import get_db
from backend.app.core.dependencies import require_analyst_or_admin, get_current_user
from backend.app.models.user import User
from backend.app.models.transaction import Transaction
from backend.app.models.prediction import FraudPrediction
from backend.app.models.alert import Alert
from backend.app.models.import_batch import ImportBatch
from backend.app.schemas.common import ImportBatchResponse, PaginatedResponse
from backend.app.services.ml_service import ml_inference_service
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/imports", tags=["CSV Batch Import"])

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 # 25 MB max upload

REQUIRED_COLUMNS = [
    "step", "type", "amount", "nameOrig", "oldbalanceOrg",
    "newbalanceOrig", "nameDest", "oldbalanceDest", "newbalanceDest"
]

@router.post("/upload-csv", response_model=ImportBatchResponse)
async def upload_transactions_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_admin)
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only standard comma-separated (.csv) files are supported."
        )

    content = await file.read()
    file_size = len(content)

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum permissible upload limit of {MAX_FILE_SIZE_BYTES // (1024*1024)}MB."
        )

    # Initialize batch record
    batch = ImportBatch(
        filename=file.filename,
        file_size_bytes=file_size,
        status="PROCESSING",
        created_by_id=current_user.id
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        batch.status = "FAILED"
        batch.error_summary = [{"row": 0, "error": f"Failed to parse CSV: {str(e)}"}]
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV file parsing failed: {str(e)}"
        )

    # Validate header columns
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        batch.status = "FAILED"
        batch.error_summary = [{"row": 0, "error": f"Missing required columns: {', '.join(missing_cols)}"}]
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"CSV schema violation. Missing required headers: {missing_cols}"
        )

    total_rows = len(df)
    batch.total_records = total_rows

    valid_transactions: List[Transaction] = []
    error_list: List[Dict[str, Any]] = []

    seen_refs = set()

    for idx, row in df.iterrows():
        row_num = idx + 2 # Accounting for header
        try:
            amt = float(row["amount"])
            if amt < 0:
                raise ValueError("Transaction amount cannot be negative")
            
            tx_type = str(row["type"]).strip().upper()
            if tx_type not in ["PAYMENT", "TRANSFER", "CASH_OUT", "DEBIT", "CASH_IN"]:
                raise ValueError(f"Unsupported transaction type '{tx_type}'")

            step = int(row["step"])
            old_orig = float(row["oldbalanceOrg"])
            new_orig = float(row["newbalanceOrig"])
            old_dest = float(row["oldbalanceDest"])
            new_dest = float(row["newbalanceDest"])

            orig = str(row["nameOrig"]).strip()
            dest = str(row["nameDest"]).strip()

            ref = f"BATCH-{batch.id.hex[:6].upper()}-R{row_num}"
            if ref in seen_refs:
                raise ValueError("Duplicate record in submission batch")
            seen_refs.add(ref)

            tx = Transaction(
                transaction_ref=ref,
                step=step,
                type=tx_type,
                amount=amt,
                name_orig=orig,
                oldbalance_org=old_orig,
                newbalance_orig=new_orig,
                name_dest=dest,
                oldbalance_dest=old_dest,
                newbalance_dest=new_dest,
                is_fraud_actual=int(row["isFraud"]) if "isFraud" in row and pd.notnull(row["isFraud"]) else 0,
                is_flagged_fraud_actual=int(row["isFlaggedFraud"]) if "isFlaggedFraud" in row and pd.notnull(row["isFlaggedFraud"]) else 0,
                import_batch_id=batch.id
            )
            valid_transactions.append(tx)

        except Exception as row_err:
            error_list.append({
                "row": row_num,
                "error": str(row_err),
                "data": {col: str(row.get(col, "")) for col in REQUIRED_COLUMNS[:4]}
            })

    # Persist valid transactions in chunks
    successful_count = 0
    if valid_transactions:
        db.bulk_save_objects(valid_transactions)
        db.commit()

        # Query back saved transactions to attach predictions & alerts
        saved_txs = db.query(Transaction).filter(Transaction.import_batch_id == batch.id).all()
        
        # Batch inference
        batch_df = pd.DataFrame([{
            "step": tx.step,
            "type": tx.type,
            "amount": tx.amount,
            "nameOrig": tx.name_orig,
            "oldbalanceOrg": tx.oldbalance_org,
            "newbalanceOrig": tx.newbalance_orig,
            "nameDest": tx.name_dest,
            "oldbalanceDest": tx.oldbalance_dest,
            "newbalanceDest": tx.newbalance_dest
        } for tx in saved_txs])

        predictions_meta = ml_inference_service.predict_batch(batch_df)

        predictions_to_insert = []
        alerts_to_insert = []

        for tx, pred_data in zip(saved_txs, predictions_meta):
            pred_id = uuid.uuid4()
            predictions_to_insert.append(FraudPrediction(
                id=pred_id,
                transaction_id=tx.id,
                fraud_probability=pred_data["fraud_probability"],
                risk_level=pred_data["risk_level"],
                is_predicted_fraud=pred_data["is_predicted_fraud"],
                model_version=pred_data["model_version"],
                model_name=pred_data["model_name"],
                explanation={"notice": "Batch automated inference"},
                prediction_notice=pred_data["prediction_notice"]
            ))

            if pred_data["risk_level"] in ["MEDIUM", "HIGH", "CRITICAL"]:
                alerts_to_insert.append(Alert(
                    transaction_id=tx.id,
                    prediction_id=pred_id,
                    severity=pred_data["risk_level"],
                    status="NEW"
                ))

        if predictions_to_insert:
            db.bulk_save_objects(predictions_to_insert)
        if alerts_to_insert:
            db.bulk_save_objects(alerts_to_insert)

        db.commit()
        successful_count = len(saved_txs)

    batch.processed_records = total_rows
    batch.successful_records = successful_count
    batch.failed_records = len(error_list)
    batch.status = "COMPLETED" if len(error_list) == 0 else ("PARTIALLY_COMPLETED" if successful_count > 0 else "FAILED")
    batch.error_summary = error_list[:100] # store top 100 errors to prevent bloated columns
    db.commit()
    db.refresh(batch)

    log_audit_event(
        db=db,
        action="CSV_IMPORT_COMPLETED",
        entity_type="ImportBatch",
        entity_id=str(batch.id),
        user=current_user,
        details={
            "filename": file.filename,
            "total": total_rows,
            "successful": successful_count,
            "failed": len(error_list)
        }
    )

    return batch

@router.get("/batches", response_model=PaginatedResponse[ImportBatchResponse])
def list_import_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ImportBatch)
    total = query.count()
    items = query.order_by(desc(ImportBatch.created_at)).offset((page - 1) * page_size).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/batches/{batch_id}", response_model=ImportBatchResponse)
def get_batch_details(
    batch_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch

@router.get("/batches/{batch_id}/errors.csv")
def download_batch_errors(
    batch_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    errors = batch.error_summary or []
    if not errors:
        return Response(content="Row,Error\n", media_type="text/csv")
    
    rows = ["Row,Error,Details"]
    quote = '"'
    double_quote = '""'
    for err in errors:
        err_msg = str(err.get('error', '')).replace(quote, double_quote)
        err_data = str(err.get('data', '')).replace(quote, double_quote)
        rows.append(f'{err.get("row", "N/A")},"{err_msg}","{err_data}"')
    
    csv_text = "\n".join(rows)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=errors_batch_{batch.id.hex[:8]}.csv"}
    )
