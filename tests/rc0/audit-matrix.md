# Audit immutability matrix
- tenant user INSERT only through approved server/business flows;
- tenant user cannot UPDATE historical audit;
- tenant user cannot DELETE historical audit;
- cross-tenant audit invisible;
- platform audit cannot be mutated by normal authenticated user;
- critical actions include actor/company/entity/timestamp.
Release blocker: customer can rewrite or delete security history.
