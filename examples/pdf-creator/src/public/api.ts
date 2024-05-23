import axios from "axios";




axios.defaults.crossDomain = true
//Access-Control-Allow-Origin 指向前端 ip:port
const Access_Control_Allow_Origin = process.env.VUE_APP_Access_Control_Allow_Origin
axios.defaults.headers.common['Access-Control-Allow-Origin'] = Access_Control_Allow_Origin == undefined ? '*' : Access_Control_Allow_Origin;
