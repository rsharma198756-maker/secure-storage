import { newEnforcer, newModel } from "casbin";
const MODEL = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
`;
const CACHE_TTL_MS = 15000;
let cached;
export const invalidateEnforcer = () => {
    cached = undefined;
};
const loadPolicies = async (pool) => {
    const model = newModel(MODEL);
    const enforcer = await newEnforcer(model);
    const rolePerms = await pool.query(`
    SELECT r.id as role_id, p.key as permission_key
    FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    JOIN permissions p ON p.id = rp.permission_id
    `);
    for (const row of rolePerms.rows) {
        const [obj, act] = row.permission_key.split(":");
        if (!obj || !act)
            continue;
        await enforcer.addPolicy(`role:${row.role_id}`, obj, act);
    }
    const userRoles = await pool.query("SELECT user_id, role_id FROM user_roles");
    for (const row of userRoles.rows) {
        await enforcer.addGroupingPolicy(`user:${row.user_id}`, `role:${row.role_id}`);
    }
    return enforcer;
};
export const getEnforcer = async (pool) => {
    const now = Date.now();
    if (!cached || now - cached.loadedAt > CACHE_TTL_MS) {
        const enforcer = await loadPolicies(pool);
        cached = { enforcer, loadedAt: now };
    }
    return cached.enforcer;
};
export const hasPermission = async (pool, userId, permissionKey) => {
    const [obj, act] = permissionKey.split(":");
    if (!obj || !act)
        return false;
    const enforcer = await getEnforcer(pool);
    return enforcer.enforce(`user:${userId}`, obj, act);
};
