import pandas as pd
from src.features import NUMERIC_FEATURES, FEATURE_VERSION, build_weather_features

def test_weather_features_are_present():
    x=build_weather_features(pd.DataFrame({'timestamp':['2025-06-01T10:00:00Z'],'rain_mm':[12.3],'temperature_c':[33.0],'humidity_pct':[82.0]}))
    assert FEATURE_VERSION == "flood-susceptibility-v2"
    assert x.iloc[0]["rain_1h_mm"] == 12.3
    assert x.iloc[0]["relative_humidity_pct"] == 82.0
