# Integration Tests

## Scope (Blueprint §34)

Integration tests verify cross-module data flows against PostgreSQL + pgvector and the API storage abstraction.
Transactions are rolled back after each test run (except for immutability tests, which use isolated test schemas).
Tests will be implemented alongside domain operations and repository code in subsequent phases.
