# SEC-18 / #799: independent pre-launch penetration test

Status: NOT PERFORMED. This plan and repository review are not independent assurance.
Launch owner: unassigned. Security/remediation owner: unassigned.

## Scope and rules of engagement

Cover the deployed listener frontend, backend APIs and relay, wallet connection,
authentication/session boundaries, purchase/transfer/listing/bidding, royalties,
contract/asset substitution, transaction summary/XDR consistency, replay, network
confusion, RPC/config failures, authorization, upload/media access, XSS/CSRF,
rate limits, secrets, dependencies, deployment and monitoring configuration.
Include nested Soroban authorization and simulated subcalls, not just the top-level invocation.

Use an agreed staging deployment, funded test wallets and synthetic accounts.
Record domains, commit SHA, backend and contract versions, test window, contacts,
permitted techniques, data retention/deletion, incident escalation and stop conditions
in a signed engagement. Production testing requires separately agreed scope.

## Vendor and evidence register

| Evidence | Required record | Status |
| --- | --- | --- |
| Duplicate issue search | Search #799–#802 and existing security/chain issues; link overlaps | Pending remote access |
| Independent vendor | Legal name, contact, Stellar/Soroban experience, independence declaration | Not selected |
| Engagement | Approved scope, rules, dates, owner and signed agreement reference | Pending |
| Report | Restricted report location, report date/hash, tested revisions and coverage | Not received |
| Retest | Vendor evidence for each fixed finding against release revisions | Pending |
| Release decision | Security and release owner names, date, residual risk acceptance | Pending |

Do not commit exploit details, secrets or personal data in this public repository.

## Remediation tracking

| Finding ID | Severity | Sanitized description | Issue | Owner | Due | Fix revision | Retest evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pending report | — | No assessment findings available | #799 | Unassigned | Before launch | — | — | Awaiting vendor |

Create a linked issue per finding; preserve vendor IDs and record accepted risks
with named approvers and expiry dates. Require retest closure of critical/high
findings before launch; document release decisions for every remaining finding.
Archive the final report and retest in access-controlled storage. #799 remains
open until vendor, report, remediation evidence and release sign-off are recorded.
