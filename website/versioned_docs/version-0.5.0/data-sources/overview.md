---
sidebar_position: 1
title: Overview
---

# Supported Data Sources

| Type | CRUD | Catalog mode | Description | Docs |
|------|------|--------------|-------------|------|
| PostgreSQL | Full | Yes | Table or catalog registration, pgvector KNN | [docs/postgres/](/docs/data-sources/postgres) |
| MySQL | Full | Yes | Table or catalog registration | [docs/mysql/](/docs/data-sources/mysql) |
| SQLite | Full | Yes | Table or catalog registration, sqlite-vec KNN, FTS | [docs/sqlite/](/docs/data-sources/sqlite) |
| MongoDB | Full | No | Collections with point lookups | [docs/mongo/](/docs/data-sources/mongo) |
| Redis | Full | No | Hashes mapped to SQL rows | [docs/redis/](/docs/data-sources/redis) |
| DynamoDB | Full | Yes | Items mapped to SQL rows, table or catalog registration, scan + filter pushdown | [docs/dynamodb/](/docs/data-sources/dynamodb) |
| SeekDB | Full | Yes | MySQL-wire CRUD, native FULLTEXT FTS, HNSW VECTOR KNN | [docs/seekdb/](/docs/data-sources/seekdb) |
| ClickHouse | Read | Yes | Columnar OLAP over HTTP, filter/limit pushdown, table or catalog registration | [docs/clickhouse/](/docs/data-sources/clickhouse) |
| Lance | Read (job-write) | No | KNN vector search, BM25 FTS; job destination | [docs/lance/](/docs/data-sources/lance) |
| CSV | Read | No | Local or remote CSV files | [docs/server.md](/docs/server) |
| Parquet | Read | No | Local or remote Parquet files | [docs/server.md](/docs/server) |
| JSON / NDJSON | Read | No | Local or remote JSON files | [docs/cli.md](/docs/cli) |
| S3 / GCS / Azure | Read | No | CSV, Parquet, Lance from object stores | [docs/S3_USAGE.md](/docs/data-sources/s3) |
| Apache Iceberg | Read | No | Schema evolution, partition pruning | [docs/iceberg/](/docs/data-sources/iceberg) |
| InfluxDB 3 | Read | No | Time-series measurements over Arrow Flight SQL | [docs/influxdb/](/docs/data-sources/influxdb) |
| Open Connector | Read | Yes | SaaS resources as stable SQL tables via a self-hosted [Open Connector](https://github.com/oomol-lab/open-connector) gateway; GitHub pack (repos, issues, PRs, reviews, commits, workflow runs, releases — [guide](/docs/data-sources/open-connector-github)), Slack pack (conversations, users, files — [guide](/docs/data-sources/open-connector-slack)), `open_connector_query` / `open_connector_scan` UDTFs, filter + limit pushdown, bounded TTL cache (more provider packs rolling out) | [docs/open-connector.md](/docs/data-sources/open-connector), [demo](/docs/data-sources/open-connector) |
| Documents | Read | No | PDF/Office/ODF/image -> per-page markdown, tables, images (local directories or S3 prefixes; `documents` feature) | [docs/documents.md](/docs/features/documents) |
