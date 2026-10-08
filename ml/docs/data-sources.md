# ML data sources and scientific boundary

## Real sources

- NASA POWER hourly point data: historical precipitation, temperature and relative humidity for a Mumbai pilot centroid.
- Existing `data/hotspots.json`: documented Mumbai/Andheri-area flood-prone locations in this repository.
- Public Mumbai flood-planning references report chronic BMC flooding spots and water-level indicators. These support the rationale for using hotspot and sensor evidence, but they are not a bundled, timestamp-aligned street-segment label table.

## Label definition used by this package

`label=1` means the generated spatial sample falls inside the selected documented hotspot buffer. This is a susceptibility proxy.

`label=0` means the generated sample is outside that proxy buffer. It does NOT mean the street was observed dry at a timestamp.

## Why this matters

Because the label is spatial and deterministic, an XGBoost model trained on it will inherit that structure. High test metrics under this setup do not establish real flood forecasting skill. This is why the live Lambda integration treats the model as an optional signal and keeps the deterministic safety engine in charge.

## Future validated target

Replace the proxy label with a timestamped outcome from:

- trusted water-level sensor observations,
- moderator-verified incident reports,
- official closures/impassability events.

Then create rows around the route-segment arrival window and apply time and geographic holdouts.
