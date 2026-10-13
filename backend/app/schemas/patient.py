from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
try:
    import pandas as pd
    import numpy as np
except ImportError:
    pd = None
    np = None
from ..config import FEATURE_NAMES

class DerivedFeatures(BaseModel):
    gravidity_parity_gap: float
    has_prior_loss: int
    has_prior_csection: int
    is_preterm: int
    hb_missing_indicator: int

class PatientInput(BaseModel):
    patient_id: Optional[str] = Field(default="PT-1001", description="Patient or record identifier")
    name: Optional[str] = Field(default="Anonymous Patient", description="Patient name or alias")
    age: Optional[float] = Field(default=28.0, description="Maternal age in years")
    
    # Core obstetric admission features
    gravidity: Optional[float] = Field(default=2.0, description="Total number of pregnancies")
    parity: Optional[float] = Field(default=1.0, description="Number of previous deliveries")
    prenatal_visits: Optional[float] = Field(default=4.0, description="Number of antenatal care (ANC) visits")
    prior_csections: Optional[float] = Field(default=0.0, description="Number of prior Cesarean sections")
    gestational_age: Optional[float] = Field(default=38.5, description="Gestational age in weeks")
    
    # Complications & comorbidities
    multiple_births: Optional[int] = Field(default=0, description="Twins or higher multiple pregnancy (1=Yes, 0=No)")
    macrosomia: Optional[int] = Field(default=0, description="Estimated fetal weight >4kg (1=Yes, 0=No)")
    placenta_previa: Optional[int] = Field(default=0, description="Placenta covering internal cervical os (1=Yes, 0=No)")
    placental_abruption: Optional[int] = Field(default=0, description="Premature separation of placenta (1=Yes, 0=No)")
    hypertensive_disorders: Optional[int] = Field(default=0, description="Gestational hypertension or preeclampsia (1=Yes, 0=No)")
    gestational_diabetes: Optional[int] = Field(default=0, description="Gestational diabetes mellitus (1=Yes, 0=No)")
    coagulation_disorders: Optional[int] = Field(default=0, description="Known coagulopathy or thrombocytopenia (1=Yes, 0=No)")
    
    # Laboratory biomarker (if available)
    maternal_hemoglobin_gdl: Optional[float] = Field(default=None, description="Hemoglobin in g/dL if measured, else None")
    
    # Regional Indian Language preference
    language: Optional[str] = Field(default="hi", description="Preferred regional Indian language (hi, bn, te, mr, ta, gu, kn, ml, or, pa, as, ur, etc.)")

    def compute_derived(self) -> DerivedFeatures:
        grav = float(self.gravidity) if self.gravidity is not None else 1.0
        par = float(self.parity) if self.parity is not None else 0.0
        ga = float(self.gestational_age) if self.gestational_age is not None else 38.0
        pcs = float(self.prior_csections) if self.prior_csections is not None else 0.0

        gap = max(0.0, grav - par)
        prior_loss = 1 if grav > (par + 1.0) else 0
        prior_cs = 1 if pcs > 0.0 else 0
        preterm = 1 if ga < 37.0 else 0
        hb_missing = 1 if (self.maternal_hemoglobin_gdl is None or (np is not None and np.isnan(self.maternal_hemoglobin_gdl))) else 0

        return DerivedFeatures(
            gravidity_parity_gap=gap,
            has_prior_loss=prior_loss,
            has_prior_csection=prior_cs,
            is_preterm=preterm,
            hb_missing_indicator=hb_missing
        )

    def to_feature_df(self) -> Any:
        """Construct exactly formatted 1-row DataFrame for model input."""
        if pd is None:
            return None
        derived = self.compute_derived()
        
        hb_val = np.nan if (np is not None and self.maternal_hemoglobin_gdl is None) else (float(self.maternal_hemoglobin_gdl) if self.maternal_hemoglobin_gdl is not None else None)

        row_dict: Dict[str, Any] = {
            "gravidity": float(self.gravidity if self.gravidity is not None else 1.0),
            "parity": float(self.parity if self.parity is not None else 0.0),
            "prenatal_visits": float(self.prenatal_visits if self.prenatal_visits is not None else 4.0),
            "prior_csections": float(self.prior_csections if self.prior_csections is not None else 0.0),
            "gestational_age": float(self.gestational_age if self.gestational_age is not None else 38.0),
            "multiple_births": float(self.multiple_births or 0),
            "macrosomia": float(self.macrosomia or 0),
            "placenta_previa": float(self.placenta_previa or 0),
            "placental_abruption": float(self.placental_abruption or 0),
            "hypertensive_disorders": float(self.hypertensive_disorders or 0),
            "gestational_diabetes": float(self.gestational_diabetes or 0),
            "coagulation_disorders": float(self.coagulation_disorders or 0),
            "gravidity_parity_gap": float(derived.gravidity_parity_gap),
            "has_prior_loss": float(derived.has_prior_loss),
            "has_prior_csection": float(derived.has_prior_csection),
            "is_preterm": float(derived.is_preterm),
            "maternal_hemoglobin_gdl": hb_val,
            "hb_missing_indicator": float(derived.hb_missing_indicator)
        }

        # Return DataFrame with strict feature column order
        df = pd.DataFrame([row_dict])[FEATURE_NAMES].astype("float32")
        return df
