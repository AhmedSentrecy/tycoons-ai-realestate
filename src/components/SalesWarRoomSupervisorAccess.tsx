import { useEffect, useState } from 'react'

export default function SalesWarRoomSupervisorAccess(){
  const [ready,setReady]=useState(false)

  useEffect(()=>{
    const refresh=()=>{
      const onMostafa=/^\/sales-war-room\/a\/mostafa-amr\/?$/.test(window.location.pathname)
      const token=localStorage.getItem('warRoomAgentToken:mostafa-amr')||''
      setReady(Boolean(onMostafa&&token))
    }
    refresh()
    const timer=window.setInterval(refresh,1000)
    window.addEventListener('focus',refresh)
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh)}
  },[])

  if(!ready)return null
  return <button onClick={()=>window.location.href='/sales-war-room/supervisor'} className="fixed bottom-24 right-4 z-[90] rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-xl">Team Control</button>
}
