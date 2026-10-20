export function normalizeIndianMobile(value:string){const digits=value.replace(/\D/g,"").replace(/^91/,"");return /^[6-9]\d{9}$/.test(digits)?`+91${digits}`:null}
