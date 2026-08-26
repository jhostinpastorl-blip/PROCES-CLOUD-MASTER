# Plan enforcement matrix

Free:
- max users enforced;
- max branches enforced;
- module_codes enforced.

Lite / Pro / Business / Enterprise:
- verify each configured limit.
- direct RPC attempt must not bypass limits.
- UI and backend must show same effective capacity.

Release blocker:
A user can exceed limits by calling DB/RPC directly.
