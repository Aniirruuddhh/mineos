# Security

The current application preserves its existing signed-session authentication and
route-level role checks. JWT issuance, token verification, and a fuller RBAC
policy belong here when they are implemented; no non-functional security
middleware has been added during this behavior-preserving refactor.
