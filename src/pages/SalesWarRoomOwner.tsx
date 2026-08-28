import { useState } from "react";
import SalesWarRoomManagement from "../components/SalesWarRoomManagement";
import { salesWarRoomApi } from "../lib/salesWarRoomApi";

export default function SalesWarRoomOwner() {
  const [token,setToken]=useState(()=>localStorage.getItem("warRoomAdminToken")||"");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  async function login(){
    try{
      setLoading(true);setError("");
      const r=await salesWarRoomApi.adminLogin(password);
      localStorage.setItem("warRoomAdminToken",r.token);
      setToken(r.token);setPassword("");
    }catch{setError("Wrong password")}
    finally{setLoading(false)}
  }

  if(token)return <SalesWarRoomManagement mode="owner" />;

  return <main className="grid min-h-screen place-items-center bg-slate-950 p-4 text-white">
    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
      <div className="text-xs font-black tracking-[.18em] text-slate-400">TYCOONS SALES WAR ROOM</div>
      <h1 className="mt-1 text-2xl font-black">Super Admin</h1>
      <p className="mt-2 text-sm text-slate-400">Full team control</p>
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="Super Admin password" className="mt-5 w-full rounded-xl border border-white/10 bg-white/10 p-3 outline-none" />
      <button disabled={loading||!password} onClick={login} className="mt-3 w-full rounded-xl bg-white p-3 font-black text-slate-950 disabled:opacity-50">{loading?"Checking…":"Login"}</button>
      {error&&<div className="mt-3 text-sm text-red-300">{error}</div>}
    </div>
  </main>;
}
