import sys
import os
import logging

# Ensure root workspace is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.data_loader import load_or_generate_dataset
from ml.pipeline import train_and_evaluate_models
from backend.app.core.database import SessionLocal
from backend.app.models.model_metadata import ModelMetadata

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("tracex.ml.train")

def run_training(version: str = "v1.0.0"):
    logger.info("Initiating TraceX ML Pipeline for version %s...", version)
    df, source_desc = load_or_generate_dataset()
    logger.info("Dataset loaded (%s). Total records: %d", source_desc, len(df))

    metadata = train_and_evaluate_models(df, output_dir="ml/models", model_version=version)
    logger.info("Training complete. Registering model in PostgreSQL...")

    db = SessionLocal()
    try:
        # Check if record for this version exists
        existing = db.query(ModelMetadata).filter(ModelMetadata.version == version).first()
        if existing:
            existing.name = metadata["name"]
            existing.algorithm = metadata["algorithm"]
            existing.metrics = metadata
            existing.training_dataset_size = metadata["training_dataset_size"]
            existing.fraud_count_in_training = metadata["fraud_count_in_training"]
            existing.is_active = True
            existing.notes = f"Trained using {source_desc}"
        else:
            new_model = ModelMetadata(
                version=version,
                name=metadata["name"],
                algorithm=metadata["algorithm"],
                hyperparameters={"source": source_desc},
                metrics=metadata,
                feature_names=metadata["feature_names"],
                training_dataset_size=metadata["training_dataset_size"],
                fraud_count_in_training=metadata["fraud_count_in_training"],
                is_active=True,
                notes=f"Trained using {source_desc}"
            )
            # Deactivate previous active models
            db.query(ModelMetadata).filter(ModelMetadata.is_active == True).update({"is_active": False})
            db.add(new_model)
        
        db.commit()
        logger.info("Model %s registered as ACTIVE model in database.", version)
    except Exception as e:
        db.rollback()
        logger.error("Failed to register model in database: %s", e)
    finally:
        db.close()

if __name__ == "__main__":
    ver = sys.argv[1] if len(sys.argv) > 1 else "v1.0.0"
    run_training(ver)
