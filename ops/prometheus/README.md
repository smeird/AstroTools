# Prometheus integration

Install `astrotools.rules.yml` in the Prometheus rules directory after reviewing
label names for the selected blackbox-exporter, node-exporter, and Apache metric
jobs. Configure blackbox probes for:

- `https://astrotools.smeird.com/api/health/live`
- `https://astrotools.smeird.com/api/health/ready`

The backup script writes `astrotools_backup_last_success_timestamp_seconds` to
the node-exporter textfile collector directory when available. Alert routing,
retention, and notification destinations belong to the organisation's
Prometheus/Alertmanager configuration and must not contain secrets here.
