"""Users domain — the employee directory over the merged ``users`` table.

After ADR-0006 the former ``members`` table was merged into ``users``: a user
row with HR fields (``employee_no``/``department``/``rank``/``grade``/``phone``)
populated *is* an employee (구성원). This domain is the directory CRUD over those
rows. Auth-only/system users (no ``employee_no``) are excluded from the listing.
"""
