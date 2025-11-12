# Backend Dependency Notes

- **File:** `src/components/SystemHealthPanel.tsx` (line 123)
  - ```123:129:src/components/SystemHealthPanel.tsx
      name: name.replace('forestshield-', ''),
      status: status === 'healthy' ? 'healthy' : 'warning',
    ```
  ```
  - Strips the `forestshield-` prefix from AWS Lambda function identifiers supplied by the backend monitoring API so the UI can display cleaner names without altering the actual deployed resource prefix.
  ```
