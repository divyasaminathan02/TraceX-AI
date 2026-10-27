import os
from typing import Tuple
import numpy as np
import pandas as pd
import logging

logger = logging.getLogger("tracex.ml.dataloader")

def generate_benchmark_paysim(n_samples: int = 30000, random_seed: int = 42) -> pd.DataFrame:
    """
    Generates a high-fidelity synthetic benchmark dataset adhering exactly to
    the PaySim financial transaction schema and behavioral fraud dynamics.
    
    Fraud vectors in PaySim:
    - Types: TRANSFER and CASH_OUT
    - Behavior: Draining old balance to zero, mismatched new balances, mule destination accounts
    - Fraud prevalence: Realistic imbalanced ratio (~1.5% - 2.0%)
    """
    np.random.seed(random_seed)
    
    types = ["PAYMENT", "TRANSFER", "CASH_OUT", "DEBIT", "CASH_IN"]
    type_probs = [0.35, 0.10, 0.35, 0.05, 0.15]
    
    chosen_types = np.random.choice(types, size=n_samples, p=type_probs)
    steps = np.sort(np.random.randint(1, 744, size=n_samples)) # 30 days chronological steps
    
    amounts = np.zeros(n_samples)
    oldbalance_org = np.zeros(n_samples)
    newbalance_orig = np.zeros(n_samples)
    oldbalance_dest = np.zeros(n_samples)
    newbalance_dest = np.zeros(n_samples)
    is_fraud = np.zeros(n_samples, dtype=int)
    is_flagged = np.zeros(n_samples, dtype=int)
    
    orig_names = [f"C{np.random.randint(100000000, 999999999)}" for _ in range(n_samples)]
    dest_names = []
    
    for i in range(n_samples):
        tx_type = chosen_types[i]
        
        # Decide if this transaction is a fraud vector (only TRANSFER or CASH_OUT in PaySim)
        if tx_type in ["TRANSFER", "CASH_OUT"] and np.random.rand() < 0.04:
            is_fraud[i] = 1
            # Fraudulent characteristics:
            # Transfer or Cash-out entire victim balance
            victim_bal = np.random.exponential(scale=180000.0) + 1000.0
            amt = victim_bal # Total account drain
            amounts[i] = amt
            oldbalance_org[i] = amt
            newbalance_orig[i] = 0.0 # Drained to zero
            
            # Destination often starts at 0 (fresh mule account)
            oldbalance_dest[i] = 0.0
            if tx_type == "TRANSFER":
                newbalance_dest[i] = amt
            else: # CASH_OUT
                newbalance_dest[i] = 0.0 # Cashed out immediately
                
            dest_names.append(f"C{np.random.randint(100000000, 999999999)}")
            
            if amt > 200000:
                is_flagged[i] = 1
        else:
            # Legitimate transactions
            if tx_type == "PAYMENT":
                amt = np.random.exponential(scale=1500.0) + 5.0
                bal_orig = amt + np.random.exponential(scale=5000.0)
                amounts[i] = amt
                oldbalance_org[i] = bal_orig
                newbalance_orig[i] = max(0.0, bal_orig - amt)
                dest_bal = np.random.exponential(scale=20000.0)
                oldbalance_dest[i] = dest_bal
                newbalance_dest[i] = dest_bal + amt
                dest_names.append(f"M{np.random.randint(100000000, 999999999)}")
            elif tx_type == "CASH_IN":
                amt = np.random.exponential(scale=12000.0) + 100.0
                bal_orig = np.random.exponential(scale=8000.0)
                amounts[i] = amt
                oldbalance_org[i] = bal_orig
                newbalance_orig[i] = bal_orig + amt
                dest_bal = np.random.exponential(scale=30000.0)
                oldbalance_dest[i] = dest_bal
                newbalance_dest[i] = max(0.0, dest_bal - amt)
                dest_names.append(f"C{np.random.randint(100000000, 999999999)}")
            elif tx_type == "DEBIT":
                amt = np.random.exponential(scale=800.0) + 10.0
                bal_orig = amt + np.random.exponential(scale=3000.0)
                amounts[i] = amt
                oldbalance_org[i] = bal_orig
                newbalance_orig[i] = max(0.0, bal_orig - amt)
                dest_bal = np.random.exponential(scale=15000.0)
                oldbalance_dest[i] = dest_bal
                newbalance_dest[i] = dest_bal + amt
                dest_names.append(f"C{np.random.randint(100000000, 999999999)}")
            else: # TRANSFER or CASH_OUT (Legitimate)
                amt = np.random.exponential(scale=15000.0) + 50.0
                bal_orig = amt + np.random.exponential(scale=25000.0)
                amounts[i] = amt
                oldbalance_org[i] = bal_orig
                newbalance_orig[i] = max(0.0, bal_orig - amt)
                dest_bal = np.random.exponential(scale=50000.0)
                oldbalance_dest[i] = dest_bal
                newbalance_dest[i] = dest_bal + (amt if tx_type == "TRANSFER" else 0.0)
                dest_names.append(f"C{np.random.randint(100000000, 999999999)}")

    df = pd.DataFrame({
        "step": steps,
        "type": chosen_types,
        "amount": np.round(amounts, 2),
        "nameOrig": orig_names,
        "oldbalanceOrg": np.round(oldbalance_org, 2),
        "newbalanceOrig": np.round(newbalance_orig, 2),
        "nameDest": dest_names,
        "oldbalanceDest": np.round(oldbalance_dest, 2),
        "newbalanceDest": np.round(newbalance_dest, 2),
        "isFraud": is_fraud,
        "isFlaggedFraud": is_flagged
    })
    
    return df

def load_or_generate_dataset(data_dir: str = "ml/data") -> Tuple[pd.DataFrame, str]:
    os.makedirs(data_dir, exist_ok=True)
    csv_candidates = [
        os.path.join(data_dir, f) for f in os.listdir(data_dir)
        if f.endswith(".csv")
    ] if os.path.exists(data_dir) else []
    
    if csv_candidates:
        primary_csv = csv_candidates[0]
        logger.info("Found existing dataset: %s", primary_csv)
        df = pd.read_csv(primary_csv)
        source_description = f"External File: {os.path.basename(primary_csv)}"
    else:
        logger.info("No external PaySim CSV detected. Generating standardized PaySim benchmark dataset...")
        df = generate_benchmark_paysim(n_samples=35000)
        output_csv = os.path.join(data_dir, "paysim_benchmark.csv")
        df.to_csv(output_csv, index=False)
        source_description = f"Standardized PaySim Benchmark Dataset ({len(df):,} transactions)"
        logger.info("Saved benchmark dataset to %s", output_csv)
        
    return df, source_description
