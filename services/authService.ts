import api from "./api";

export interface LoginPayload {
    email: string;
    password: string;
}

export interface UserResponse {
    id: number;
    name: string;
    email: string;
    phone: string;
    uesrType: string;
    accountLocked: boolean;
    roles: string[];
    permission: string[];
    tenantCode: string;
    tenantSlug: string;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        accessToken: string;
        tokenType: string;
        expiresIn: number;
        userResponse: UserResponse;
    }
}

export const loginApi = async (credentials: LoginPayload): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials)
    return response.data
}

//OpenAPI doc spec (SwaggerUI) => The expected response 
// {
//   "success": true,
//   "message": "string",
//   "data": {
//     "accessToken": "string",
//     "tokenType": "string",
//     "expiresIn": 0,
//     "userResponse": {
//       "id": 0,
//       "name": "string",
//       "email": "string",
//       "phone": "string",
//       "userType": "SUPER_ADMIN",
//       "accountLocked": true,
//       "roles": [
//         "string"
//       ],
//       "permission": [
//         "string"
//       ],
//       "tenantCode": "string",
//       "tenantSlug": "string"
//     }
//   },
//   "status": 0,
//   "errors": "string",
//   "timestamp": "2026-08-06T09:04:17.159Z"
// }

// The "AuthResponse" schema (from the SwaggerUI documentation):
// AuthResponseCollapse allobject
// accessTokenstring
// tokenTypestring
// expiresInintegerint64
// userResponseCollapse allobject
// idintegerint64
// namestring
// emailstring
// phonestring
// userTypeCollapse allstring
// EnumCollapse allarray
// #0"SUPER_ADMIN"
// #1"TENANT_OWNER"
// #2"NORMAL"
// accountLockedboolean
// rolesCollapse allarray<string>unique
// Itemsstring
// permissionCollapse allarray<string>unique
// Itemsstring
// tenantCodestring
// tenantSlugstring