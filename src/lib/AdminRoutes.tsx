import { Person, Storefront, Key, Assessment } from "@mui/icons-material";
const adminRoutes=
    [
        {name:'Users',path:'/admin/users',icon:<Person/>, info:'Manage application users and their roles.'},
        {name:'Locations',path:'/admin/locations',icon:<Storefront/>, info:'Manage business locations and their details.'},
        {name:'Passphrases',path:'/admin/passphrases',icon:<Key/>, info:'Manage secure passphrases for system access.'},
        {name:'Features',path:'/admin/features',icon:<Storefront/>, info:'Manage portal features and their visibility.'},
        {name:'Roles & Permissions',path:'/admin/roles-permissions',icon:<Person/>, info:'Define roles and assign permissions.'},
        {name:'Audit Trails',path:'/admin/audit-trails',icon:<Assessment/>, info:'View system audit logs and activity.'},
    ]    
export default adminRoutes;