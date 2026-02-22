# Errors

The TableCraft Engine includes a robust error handling system. It validates all inputs (filters, sorts, selections) and throws typed errors that you can catch and return as proper HTTP responses.

## 1. Input Validation

The engine automatically validates all incoming parameters against your schema.

* **Unknown Fields:** If a user tries to filter/sort by a field that doesn't exist or isn't enabled in the config, the engine throws a `FieldError`.
* **Type Mismatch:** If a user tries to filter a `number` column with a string like "abc", the engine throws a `ValidationError`.
* **Hidden Fields:** Users cannot select or filter by hidden columns.

## 2. Error Types

The engine exports several error classes that extend `TableCraftError`.

| Error Class         | Code               | Description                                                          | HTTP Status |
| ------------------- | ------------------ | -------------------------------------------------------------------- | ----------- |
| `ValidationError`   | `VALIDATION_ERROR` | Invalid input format (e.g., "abc" for a number).                     | 400         |
| `FieldError`        | `FIELD_ERROR`      | Invalid field name (unknown, hidden, or not sortable/filterable).    | 400         |
| `ConfigError`       | `CONFIG_ERROR`     | Invalid table configuration (developer error).                       | 400         |
| `DialectError`      | `DIALECT_ERROR`    | Feature not supported by the current database dialect.               | 400         |
| `QueryError`        | `QUERY_ERROR`      | Database query failed (e.g., constraint violation).                  | 500         |
| `AccessDeniedError` | `ACCESS_DENIED`    | User lacks permission (RBAC).                                        | 403         |
| `NotFoundError`     | `NOT_FOUND`        | Resource not found.                                                  | 404         |

## 3. Handling Errors in Your Framework

You should wrap your engine calls in a try-catch block and return appropriate HTTP responses.

{% tabs %}
{% tab title="Hono Example" %}
```typescript
import { TableCraftError } from '@tablecraft/engine';

app.onError((err, c) => {
  if (err instanceof TableCraftError) {
    return c.json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details // specific field errors
      }
    }, err.statusCode);
  }

  // Handle unknown errors
  console.error(err);
  return c.json({ error: 'Internal Server Error' }, 500);
});
```
{% endtab %}

{% tab title="Response Format" %}
If a user requests `GET /products?sort=invalid_column`, they will receive:

```json
{
  "error": {
    "code": "FIELD_ERROR",
    "message": "Field 'invalid_column' is not sortable",
    "details": {
      "field": "invalid_column"
    }
  }
}
```
{% endtab %}
{% endtabs %}

## 4. Dialect Awareness

The engine automatically detects your database dialect (PostgreSQL, MySQL, SQLite) and adjusts its behavior.

{% columns %}
{% column %}
#### Case Sensitivity

* **Postgres:** Uses `ILIKE` for case-insensitive search.
* **MySQL/SQLite:** Falls back to `LIKE` (often naturally case-insensitive depending on collation).
{% endcolumn %}

{% column %}
#### Feature Support

If a feature is only available on certain databases, the engine throws a `DialectError` instead of sending a query that will fail with a cryptic database error.

**Example — `first` subquery on MySQL:**
```
DialectError: 'first' is not supported on mysql.
Use PostgreSQL or write a raw query.
```

`'first'` mode uses `row_to_json()`, which is PostgreSQL-only. `'count'` and `'exists'` work on all dialects.
{% endcolumn %}
{% endcolumns %}
