-- Northlight Galleria, compact builder. Paste into the Studio command bar, press Enter.
-- Metres throughout; 1 stud = 0.3 m. Remove with: workspace.Mall:Destroy()
local L,W = game:GetService("Lighting"), workspace
local function st(m) return m/0.3 end
local FF,CH,SL,SC = 5.2,4.4,0.45,2.45
local AW,AD,AH,WL = 60,40,16.6,110
local HV,WO,UO,SO = 3,8,20,22.4
local RED = Color3.fromRGB(255,28,22)
local C = {fl=Color3.fromRGB(96,94,92),ce=Color3.fromRGB(58,57,56),wa=Color3.fromRGB(122,120,116),
 fr=Color3.fromRGB(78,76,74),gl=Color3.fromRGB(26,28,33),sh=Color3.fromRGB(68,68,70),
 me=Color3.fromRGB(128,128,132),ra=Color3.fromRGB(146,146,150),bl=Color3.fromRGB(106,104,100),
 br=Color3.fromRGB(152,118,55),tr=Color3.fromRGB(102,100,98),pa=Color3.fromRGB(18,17,17)}
local D = {N={Vector3.new(0,0,1),Vector3.new(1,0,0)},S={Vector3.new(0,0,-1),Vector3.new(-1,0,0)},
 E={Vector3.new(1,0,0),Vector3.new(0,0,-1)},W={Vector3.new(-1,0,0),Vector3.new(0,0,1)}}
local FLOORS = {{"G",0,true},{"F1",5.2,true},{"F2",10.4,true},{"F3",15.6,false}}
local TRADE = {G=2,F1=1,F2=0,F3=0}
local HUE = {N=Color3.fromRGB(255,60,190),E=Color3.fromRGB(40,220,255),
 S=Color3.fromRGB(255,170,40),W=Color3.fromRGB(80,255,140)}

local root,lc
local function P(n,s,cf,col,mat)
 local p=Instance.new("Part")
 p.Name=n; p.Size=Vector3.new(math.max(st(s.X),.05),math.max(st(s.Y),.05),math.max(st(s.Z),.05))
 p.CFrame=cf; p.Color=col; p.Anchored=true; p.Material=mat or Enum.Material.SmoothPlastic
 p.TopSurface=Enum.SurfaceType.Smooth; p.BottomSurface=Enum.SurfaceType.Smooth
 p.Parent=root; return p
end
local function G(p,col,b,r)
 local l=Instance.new("PointLight"); l.Color=col; l.Brightness=b; l.Range=st(r)
 l.Shadows=false; l.Parent=p; lc=lc+1
end

local function wing(fid,key,y,fitted,ground)
 local fw,ri = D[key][1],D[key][2]
 local off = (key=="N" or key=="S") and AD/2 or AW/2
 local ctr = fw*st(off) + fw*st(WL/2) + Vector3.new(0,st(y),0)
 local orient = CFrame.lookAt(Vector3.zero,fw).Rotation
 local function A(lat,h,al) return CFrame.new(ctr+ri*st(lat)+fw*st(al or 0)+Vector3.new(0,st(h),0))*orient end
 local function S(a,b,c) return Vector3.new(a,b,c) end

 if ground then P("Slab",S(SO*2,SL,WL),A(0,-SL/2),C.fl)
 else
  local w = SO-HV
  for _,sd in {-1,1} do
   P("Deck",S(w,SL,WL),A(sd*(HV+w/2),-SL/2),C.fl)
   P("Balustrade",S(.1,1.12,WL),A(sd*HV,.56),C.gl)
   P("Handrail",S(.22,.1,WL),A(sd*HV,1.14),C.ra)
  end
  for _,t in {-WL*.22,WL*.3} do P("Bridge",S(6,SL,3.2),A(0,-SL/2,t),C.fl) end
 end

 for _,sd in {-1,1} do
  local w = SO-HV
  P("Soffit",S(w,.3,WL),A(sd*(HV+w/2),CH),C.ce)
  P("OuterWall",S(.6,CH,WL),A(sd*SO,CH/2),C.bl)
  P("UnitBack",S(.5,SC,WL),A(sd*UO,SC/2),C.bl)
  P("ServiceCeiling",S(2.4,.3,WL),A(sd*(UO+1.2),SC),C.ce)
 end
 P("EndWall",S(SO*2,CH,.6),A(0,CH/2,WL/2),C.wa)
 P("Entrance",S(13,CH-.9,.25),A(0,CH/2-.3,WL/2-.45),C.gl)
 if not fitted then return end

 -- Units: seeded, so every wing differs but the building never does.
 local rng = Random.new(#key*977 + math.floor(y*13) + 41)
 local trading = TRADE[fid]
 for _,sd in {-1,1} do
  local t = 0
  while WL-t > 5.5 do
   local w = rng:NextNumber(7,26); if WL-(t+w) < 5.5 then w = WL-t end
   local at = -WL/2 + t + w/2
   local rec = ({0,0,0,.7,1.4})[rng:NextInteger(1,5)]
   local fa = rng:NextNumber(.85,1.45)
   local lat, gh = sd*(WO+rec), CH-fa-.25
   local lit = trading > 0 and rng:NextNumber() < .3
   if lit then trading = trading-1 end

   P("Fascia",S(.8,fa,w),A(lat,CH-fa/2,at),C.fr)
   for _,e in {-1,1} do
    P("Pilaster",S(.95,gh+.3,.55),A(lat,gh/2+.2,at+e*w/2),C.fr)
    P("PartyWall",S(12,3,.3),A(sd*(WO+6),1.5,at+e*w/2),C.wa)
   end
   P("Sill",S(.22,.24,w-.9),A(lat-sd*.34,.12,at),C.tr)
   for m=0,math.max(1,math.floor(w/2.6))-1 do
    P("Mullion",S(.14,gh,.1),A(lat-sd*.36,gh/2+.2,at+(m/math.max(1,math.floor(w/2.6))-.45)*(w-.9)),C.me)
   end
   local state = rng:NextInteger(1,5)
   if state == 1 then P("Shutter",S(.16,gh,w-.9),A(lat-sd*.3,gh/2+.2,at),C.sh)
   elseif state == 2 then P("Shutter",S(.16,gh*.6,w-.9),A(lat-sd*.3,gh*.7+.35,at),C.sh)
   else
    P("Rack",S(3,1.6,.7),A(sd*(WO+4.5),.8,at),C.wa)
    P("Counter",S(.8,1,2.6),A(sd*(WO+2.6),.5,at),C.tr)
    if rng:NextNumber() < .75 then
     local tint = rng:NextNumber() < .55 and Color3.fromRGB(248,236,208) or Color3.fromRGB(222,230,244)
     G(P("Sec",S(.5,.12,.5),A(sd*(WO+rng:NextNumber(5,9)),2.6,at),tint,Enum.Material.Neon),tint,rng:NextNumber(1,2.6),10)
    end
   end
   if lit then
    local sg = P("Neon",S(3.4,.42,.1),CFrame.lookAt(A(lat-sd*.88,CH-fa/2,at).Position,
      A(lat-sd*.88,CH-fa/2,at).Position - ri*sd),HUE[key],Enum.Material.Neon)
    G(sg,HUE[key],3.2,14)
   end
   P("BackDoor",S(.16,2.05,.95),A(sd*(UO-.2),1.02,at),C.me)
   t = t + w
  end
 end

 -- Downlights: irregular spacing, a third of them dead.
 for _,sd in {-1,1} do
  local t = -WL/2 + rng:NextNumber(1.5,5)
  while t < WL/2-1.5 do
   local pos = A(sd*rng:NextNumber(HV+1.1,WO-1.1),CH-.14,t)
   P("Can",S(.42,.14,.42),pos,C.me)
   if rng:NextNumber() > .34 then
    G(P("Lamp",S(.3,.05,.3),pos*CFrame.new(0,-st(.07),0),RED,Enum.Material.Neon),RED,rng:NextNumber(1.3,2.6),8.5)
   end
   t = t + rng:NextNumber(4.5,11)
  end
 end
 -- EXIT signs mark exits, nothing else.
 for _,sp in {{-WL/2+2,1},{0,-1},{WL/2-2,1}} do
  local pos = A(sp[2]*(WO-.5),2.3,sp[1]).Position
  G(P("Exit",S(.62,.26,.1),CFrame.lookAt(pos,pos-ri*sp[2]),RED,Enum.Material.Neon),RED,.9,7)
 end
end

local SEG = {["0"]="abcdef",["3"]="abgcd"}
local SG = {a={0,.92,.72,.15},b={.4,.48,.15,.78},c={.4,-.48,.15,.78},d={0,-.92,.72,.15},
 e={-.4,-.48,.15,.78},f={-.4,.48,.15,.78},g={0,0,.72,.15}}

local function build()
 if W:FindFirstChild("Mall") then W.Mall:Destroy() end
 for _,n in {"Baseplate","SpawnLocation","Part"} do
  local o = W:FindFirstChild(n); while o do o:Destroy(); o = W:FindFirstChild(n) end
 end
 root = Instance.new("Folder"); root.Name="Mall"; root.Parent=W; lc=0

 -- Atrium: slab, balcony decks, feature columns.
 P("Atrium",Vector3.new(AW,SL,AD),CFrame.new(0,-st(SL/2),0),C.fl)
 local vw,vd = AW*.66, AD*.58
 for _,f in FLOORS do
  if f[2] > 0 then
   local y,dx,dz = f[2],(AW-vw)/4,(AD-vd)/4
   P("DeckN",Vector3.new(AW,SL,dz*2),CFrame.new(0,st(y-SL/2),st(vd/2+dz)),C.fl)
   P("DeckS",Vector3.new(AW,SL,dz*2),CFrame.new(0,st(y-SL/2),-st(vd/2+dz)),C.fl)
   P("DeckE",Vector3.new(dx*2,SL,vd),CFrame.new(st(vw/2+dx),st(y-SL/2),0),C.fl)
   P("DeckW",Vector3.new(dx*2,SL,vd),CFrame.new(-st(vw/2+dx),st(y-SL/2),0),C.fl)
   for _,z in {vd/2,-vd/2} do P("Rail",Vector3.new(vw,1.12,.1),CFrame.new(0,st(y+.56),st(z)),C.gl) end
   for _,x in {vw/2,-vw/2} do P("Rail",Vector3.new(.1,1.12,vd),CFrame.new(st(x),st(y+.56),0),C.gl) end
  end
 end
 -- Roof trusses, so the glass roof reads as a roof and not as a hole.
 for i=0,8 do
  local z = -AD/2+(i+.5)*AD/9
  P("Truss",Vector3.new(AW+1,.34,.55),CFrame.new(0,st(AH-.55),st(z)),C.me)
  P("TrussLow",Vector3.new(AW+1,.26,.38),CFrame.new(0,st(AH-1.8),st(z)),C.me)
 end
 for k=0,12 do
  P("Bar",Vector3.new(.18,.22,AD),CFrame.new(st(-AW/2+(k+.5)*AW/13),st(AH-.13),0),C.me)
 end

 -- The Great Clock: a 1986 display bolted to an 1904 movement's case.
 P("Plinth",Vector3.new(7.4,.44,7.4),CFrame.new(0,st(.22),0),C.tr)
 P("Plinth2",Vector3.new(6.2,.4,6.2),CFrame.new(0,st(.62),0),C.tr)
 P("Case",Vector3.new(5.2,3.6,3),CFrame.new(0,st(5.75),0),C.me)
 P("Cornice",Vector3.new(5.7,.3,3.5),CFrame.new(0,st(7.68),0),C.br)
 P("CorniceB",Vector3.new(5.7,.26,3.5),CFrame.new(0,st(3.9),0),C.br)
 for _,fc in {-1,1} do
  local zf = fc*1.52
  P("Backing",Vector3.new(4.7,2.5,.14),CFrame.new(0,st(5.8),st(zf)),C.pa)
  local sc,x = 1.15/2, 0
  local dw,gap = 1.1*sc, .2
  local total = 4*dw + .42*dw + 4*gap
  x = -(fc<0 and -1 or 1)*total/2
  local m = fc<0 and -1 or 1
  for i=1,5 do
   local ch = ("03:33"):sub(i,i)
   if ch == ":" then
    for _,dy in {.42,-.42} do
     P("Colon",Vector3.new(.15*sc,.15*sc,.07),CFrame.new(st(x+m*.21*dw),st(5.8+dy*sc),st(zf+fc*.13)),RED,Enum.Material.Neon)
    end
    x = x + m*(.42*dw+gap)
   else
    local on = SEG[ch]
    for sg,g in SG do
     local isOn = on:find(sg) ~= nil
     P("Seg",Vector3.new(g[3]*sc,g[4]*sc,.07),CFrame.new(st(x+m*(dw/2+g[1]*sc)),st(5.8+g[2]*sc),st(zf+fc*.13)),
       isOn and RED or Color3.fromRGB(26,6,5), isOn and Enum.Material.Neon or Enum.Material.SmoothPlastic)
    end
    x = x + m*(dw+gap)
   end
  end
  G(P("Spill",Vector3.new(.3,.3,.3),CFrame.new(0,st(5.2),st(fc*4.5)),RED,Enum.Material.Neon),RED,2.2,14)
 end

 for _,f in FLOORS do
  for _,k in {"N","E","S","W"} do wing(f[1],k,f[2],f[3],f[2]==0) end
 end

 local sp = Instance.new("SpawnLocation")
 sp.Name="StaffEntrance"; sp.Size=Vector3.new(st(4),st(.3),st(4))
 sp.CFrame=CFrame.new(0,st(.3),st(-16)); sp.Anchored=true; sp.Neutral=true
 sp.Transparency=1; sp.CanCollide=false; sp.Parent=root

 -- Night, and the weather outside.
 pcall(function() L.Technology = Enum.Technology.Future end)
 L.GlobalShadows=true; L.Ambient=Color3.fromRGB(3,3,5); L.OutdoorAmbient=Color3.fromRGB(12,14,20)
 L.Brightness=.35; L.ExposureCompensation=-.1; L.ClockTime=0; L.GeographicLatitude=20
 L.EnvironmentDiffuseScale=.18; L.EnvironmentSpecularScale=.65
 for _,n in {"NightAtmosphere","NightBloom","NightColour"} do
  local o=L:FindFirstChild(n); if o then o:Destroy() end
 end
 local a=Instance.new("Atmosphere"); a.Name="NightAtmosphere"; a.Density=.38; a.Haze=1.4
 a.Glare=.2; a.Color=Color3.fromRGB(180,182,190); a.Decay=Color3.fromRGB(88,92,106); a.Parent=L
 local b=Instance.new("BloomEffect"); b.Name="NightBloom"; b.Intensity=.75; b.Size=30; b.Threshold=1.35; b.Parent=L
 local cc=Instance.new("ColorCorrectionEffect"); cc.Name="NightColour"; cc.Saturation=-.05
 cc.Contrast=.24; cc.TintColor=Color3.fromRGB(232,236,255); cc.Parent=L
 local ter=W:FindFirstChildOfClass("Terrain")
 if ter then
  local o=ter:FindFirstChildOfClass("Clouds"); if o then o:Destroy() end
  local cl=Instance.new("Clouds"); cl.Cover=.72; cl.Density=.6
  cl.Color=Color3.fromRGB(150,158,175); cl.Parent=ter
 end
 pcall(function() W.StreamingEnabled = true end)
 print(("[Northlight Galleria] %d parts, %d lights"):format(#root:GetDescendants(),lc))
end

build()
