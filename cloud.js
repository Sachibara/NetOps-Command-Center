(() => {
  "use strict";

  const SUPABASE_URL = "https://taizmxigaeyrxtvnnzbw.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_EmCXMq9_SNjG-ISf6_9v7Q_iHZsLz29";

  if (!window.supabase?.createClient) {
    window.NetOpsCloud = { available:false };
    console.error("Supabase client failed to load.");
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
  });

  let session=null,workspaceId=null,role="demo";

  async function init(){
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    session=data.session||null;
    return session;
  }

  async function signIn(email,password){
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error)throw error;
    session=data.session||null;
    return data;
  }

  async function signUp(email,password,displayName){
    const {data,error}=await client.auth.signUp({
      email,password,
      options:{data:{display_name:displayName||"NetOps User"}}
    });
    if(error)throw error;
    session=data.session||null;
    return data;
  }

  async function signOut(){
    const {error}=await client.auth.signOut();
    if(error)throw error;
    session=null;workspaceId=null;role="demo";
  }

  async function bootstrap(seedState,displayName=""){
    const {data:authData,error:authError}=await client.auth.getUser();
    if(authError)throw authError;
    const user=authData.user;
    if(!user)throw new Error("No authenticated user session.");

    const profileName=displayName||user.user_metadata?.display_name||user.email?.split("@")[0]||"NetOps User";
    const {error:profileError}=await client.from("netops_profiles").upsert({
      user_id:user.id,display_name:profileName,updated_at:new Date().toISOString()
    },{onConflict:"user_id"});
    if(profileError)throw profileError;

    let {data:workspaces,error:readError}=await client
      .from("netops_workspaces")
      .select("id,owner_id,name,state,created_at,updated_at")
      .order("created_at",{ascending:true})
      .limit(1);
    if(readError)throw readError;

    let workspace=workspaces?.[0]||null;
    if(!workspace){
      const {data:created,error:createError}=await client
        .from("netops_workspaces")
        .insert({owner_id:user.id,name:"NetOps Enterprise",state:seedState||{}})
        .select("id,owner_id,name,state,created_at,updated_at")
        .single();
      if(createError)throw createError;
      workspace=created;

      const {error:membershipError}=await client.from("netops_memberships").insert({
        workspace_id:workspace.id,user_id:user.id,role:"admin"
      });
      if(membershipError)throw membershipError;
    }

    workspaceId=workspace.id;

    const {data:membership,error:memberError}=await client
      .from("netops_memberships")
      .select("role")
      .eq("workspace_id",workspace.id)
      .eq("user_id",user.id)
      .maybeSingle();
    if(memberError)throw memberError;

    role=workspace.owner_id===user.id?"admin":(membership?.role||"viewer");

    const {data:serverAudit,error:auditError}=await client
      .from("netops_audit_events")
      .select("id,module,action,detail,created_at")
      .eq("workspace_id",workspace.id)
      .order("created_at",{ascending:false})
      .limit(250);
    if(auditError)throw auditError;

    return {
      user,role,workspaceId,name:workspace.name,
      state:workspace.state&&Object.keys(workspace.state).length?workspace.state:seedState,
      audit:(serverAudit||[]).map(row=>({
        id:row.id,module:row.module,action:row.action,detail:row.detail,at:row.created_at
      }))
    };
  }

  async function saveWorkspace(state){
    if(!session||!workspaceId||role==="viewer")return;
    const {error}=await client.from("netops_workspaces").update({
      state,updated_at:new Date().toISOString()
    }).eq("id",workspaceId);
    if(error)throw error;
  }

  async function pushAudit(event){
    if(!session||!workspaceId||role==="viewer")return;
    const actorId=session.user?.id;
    if(!actorId)return;
    const {error}=await client.from("netops_audit_events").insert({
      workspace_id:workspaceId,actor_id:actorId,module:String(event.module||"System"),
      action:String(event.action||"Action"),detail:String(event.detail||""),
      created_at:event.at||new Date().toISOString()
    });
    if(error)throw error;
  }

  function isCloudActive(){return!!session&&!!workspaceId}
  function getRole(){return role}
  function getUser(){return session?.user||null}

  client.auth.onAuthStateChange((_event,nextSession)=>{
    session=nextSession||null;
    if(!session){workspaceId=null;role="demo";}
  });

  window.NetOpsCloud={
    available:true,client,init,signIn,signUp,signOut,bootstrap,
    saveWorkspace,pushAudit,isCloudActive,getRole,getUser
  };
})();