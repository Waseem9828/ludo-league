export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

const PERMISSION_ERROR_NAME = 'FirestorePermissionError';

export class FirestorePermissionError extends Error {
  public context: SecurityRuleContext;
  constructor(context: SecurityRuleContext) {
    const { path, operation } = context;
    const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:
{
"path": "${path}",
"method": "${operation}"
}`;
    super(message);
    this.name = PERMISSION_ERROR_NAME;
    this.context = context;
  }
}
