export default function SalesWarRoomSupervisorAccess(){
  const onMostafa=/^\/sales-war-room\/a\/mostafa-amr\/?$/.test(window.location.pathname)
  const token=localStorage.getItem('warRoomAgentToken:mostafa-amr')||''
  if(!onMostafa||!token)return null
  return <button onClick={()=>window.location.href='/sales-war-room/supervisor'} className="fixed bottom-24 right-4 z-[90] rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-xl">Team Control</button>
}
