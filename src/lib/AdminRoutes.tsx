import { Person, Storefront, Key } from "@mui/icons-material";
const adminRoutes=
    [
        {name:'Users',path:'/admin/users',icon:<Person/>, info:'Manage application users and their roles.'},
        {name:'Locations',path:'/admin/locations',icon:<Storefront/>, info:'Manage business locations and their details.'},
        {name:'Passphrases',path:'/admin/passphrases',icon:<Key/>, info:'Manage secure passphrases for system access.'},
    ]    
export default adminRoutes;