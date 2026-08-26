# RLS / tenant attack matrix v0.24
Create two tenants A and B and users ownerA, staffA, ownerB.
Required:
1 ownerA SELECT B memberships -> zero rows.
2 ownerA UPDATE B role -> denied.
3 ownerA invite using role_id from B -> role cross tenant.
4 staffA without users.invite -> create invitation denied.
5 invitation accepted by different email -> denied.
6 expired invitation -> denied.
7 accepted invitation replay -> denied.
8 branch creation at max_branches -> PLAN_BRANCH_LIMIT.
9 invitation at max_users -> PLAN_USER_LIMIT.
10 suspended staffA -> active membership assertion fails.
11 removed staffA -> context unavailable.
12 onboarding state of another user -> invisible.
13 platform admin membership is not implicitly created in A/B.
14 company module not in entitlement -> rejected.
15 anonymous RPC calls -> rejected.
