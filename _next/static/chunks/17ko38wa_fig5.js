(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,9852,e=>{"use strict";var t=e.i(43476),r=e.i(71645),i=e.i(75056),a=e.i(25234),o=e.i(28600),n=e.i(43257),s=e.i(48455),l=e.i(31067),u=e.i(90072),h=e.i(67335),m=u;let d=parseInt(u.REVISION.replace(/\D+/g,""));class f extends m.ShaderMaterial{constructor(e=new m.Vector2){super({uniforms:{inputBuffer:new m.Uniform(null),depthBuffer:new m.Uniform(null),resolution:new m.Uniform(new m.Vector2),texelSize:new m.Uniform(new m.Vector2),halfTexelSize:new m.Uniform(new m.Vector2),kernel:new m.Uniform(0),scale:new m.Uniform(1),cameraNear:new m.Uniform(0),cameraFar:new m.Uniform(1),minDepthThreshold:new m.Uniform(0),maxDepthThreshold:new m.Uniform(1),depthScale:new m.Uniform(0),depthToBlurRatioBias:new m.Uniform(.25)},fragmentShader:`#include <common>
        #include <dithering_pars_fragment>      
        uniform sampler2D inputBuffer;
        uniform sampler2D depthBuffer;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform float minDepthThreshold;
        uniform float maxDepthThreshold;
        uniform float depthScale;
        uniform float depthToBlurRatioBias;
        varying vec2 vUv;
        varying vec2 vUv0;
        varying vec2 vUv1;
        varying vec2 vUv2;
        varying vec2 vUv3;

        void main() {
          float depthFactor = 0.0;
          
          #ifdef USE_DEPTH
            vec4 depth = texture2D(depthBuffer, vUv);
            depthFactor = smoothstep(minDepthThreshold, maxDepthThreshold, 1.0-(depth.r * depth.a));
            depthFactor *= depthScale;
            depthFactor = max(0.0, min(1.0, depthFactor + 0.25));
          #endif
          
          vec4 sum = texture2D(inputBuffer, mix(vUv0, vUv, depthFactor));
          sum += texture2D(inputBuffer, mix(vUv1, vUv, depthFactor));
          sum += texture2D(inputBuffer, mix(vUv2, vUv, depthFactor));
          sum += texture2D(inputBuffer, mix(vUv3, vUv, depthFactor));
          gl_FragColor = sum * 0.25 ;

          #include <dithering_fragment>
          #include <tonemapping_fragment>
          #include <${d>=154?"colorspace_fragment":"encodings_fragment"}>
        }`,vertexShader:`uniform vec2 texelSize;
        uniform vec2 halfTexelSize;
        uniform float kernel;
        uniform float scale;
        varying vec2 vUv;
        varying vec2 vUv0;
        varying vec2 vUv1;
        varying vec2 vUv2;
        varying vec2 vUv3;

        void main() {
          vec2 uv = position.xy * 0.5 + 0.5;
          vUv = uv;

          vec2 dUv = (texelSize * vec2(kernel) + halfTexelSize) * scale;
          vUv0 = vec2(uv.x - dUv.x, uv.y + dUv.y);
          vUv1 = vec2(uv.x + dUv.x, uv.y + dUv.y);
          vUv2 = vec2(uv.x + dUv.x, uv.y - dUv.y);
          vUv3 = vec2(uv.x - dUv.x, uv.y - dUv.y);

          gl_Position = vec4(position.xy, 1.0, 1.0);
        }`,blending:m.NoBlending,depthWrite:!1,depthTest:!1}),this.toneMapped=!1,this.setTexelSize(e.x,e.y),this.kernel=new Float32Array([0,1,2,2,3])}setTexelSize(e,t){this.uniforms.texelSize.value.set(e,t),this.uniforms.halfTexelSize.value.set(e,t).multiplyScalar(.5)}setResolution(e){this.uniforms.resolution.value.copy(e)}}class c{constructor({gl:e,resolution:t,width:r=500,height:i=500,minDepthThreshold:a=0,maxDepthThreshold:o=1,depthScale:n=0,depthToBlurRatioBias:s=.25}){this.renderToScreen=!1,this.renderTargetA=new u.WebGLRenderTarget(t,t,{minFilter:u.LinearFilter,magFilter:u.LinearFilter,stencilBuffer:!1,depthBuffer:!1,type:u.HalfFloatType}),this.renderTargetB=this.renderTargetA.clone(),this.convolutionMaterial=new f,this.convolutionMaterial.setTexelSize(1/r,1/i),this.convolutionMaterial.setResolution(new u.Vector2(r,i)),this.scene=new u.Scene,this.camera=new u.Camera,this.convolutionMaterial.uniforms.minDepthThreshold.value=a,this.convolutionMaterial.uniforms.maxDepthThreshold.value=o,this.convolutionMaterial.uniforms.depthScale.value=n,this.convolutionMaterial.uniforms.depthToBlurRatioBias.value=s,this.convolutionMaterial.defines.USE_DEPTH=n>0;const l=new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),h=new Float32Array([0,0,2,0,0,2]),m=new u.BufferGeometry;m.setAttribute("position",new u.BufferAttribute(l,3)),m.setAttribute("uv",new u.BufferAttribute(h,2)),this.screen=new u.Mesh(m,this.convolutionMaterial),this.screen.frustumCulled=!1,this.scene.add(this.screen)}render(e,t,r){let i,a,o,n=this.scene,s=this.camera,l=this.renderTargetA,u=this.renderTargetB,h=this.convolutionMaterial,m=h.uniforms;m.depthBuffer.value=t.depthTexture;let d=h.kernel,f=t;for(a=0,o=d.length-1;a<o;++a)i=(1&a)==0?l:u,m.kernel.value=d[a],m.inputBuffer.value=f.texture,e.setRenderTarget(i),e.render(n,s),f=i;m.kernel.value=d[a],m.inputBuffer.value=f.texture,e.setRenderTarget(this.renderToScreen?null:r),e.render(n,s)}}var v=u;class p extends v.MeshStandardMaterial{constructor(e={}){super(e),this._tDepth={value:null},this._distortionMap={value:null},this._tDiffuse={value:null},this._tDiffuseBlur={value:null},this._textureMatrix={value:null},this._hasBlur={value:!1},this._mirror={value:0},this._mixBlur={value:0},this._blurStrength={value:.5},this._minDepthThreshold={value:.9},this._maxDepthThreshold={value:1},this._depthScale={value:0},this._depthToBlurRatioBias={value:.25},this._distortion={value:1},this._mixContrast={value:1},this.setValues(e)}onBeforeCompile(e){var t;null!=(t=e.defines)&&t.USE_UV||(e.defines.USE_UV=""),e.uniforms.hasBlur=this._hasBlur,e.uniforms.tDiffuse=this._tDiffuse,e.uniforms.tDepth=this._tDepth,e.uniforms.distortionMap=this._distortionMap,e.uniforms.tDiffuseBlur=this._tDiffuseBlur,e.uniforms.textureMatrix=this._textureMatrix,e.uniforms.mirror=this._mirror,e.uniforms.mixBlur=this._mixBlur,e.uniforms.mixStrength=this._blurStrength,e.uniforms.minDepthThreshold=this._minDepthThreshold,e.uniforms.maxDepthThreshold=this._maxDepthThreshold,e.uniforms.depthScale=this._depthScale,e.uniforms.depthToBlurRatioBias=this._depthToBlurRatioBias,e.uniforms.distortion=this._distortion,e.uniforms.mixContrast=this._mixContrast,e.vertexShader=`
        uniform mat4 textureMatrix;
        varying vec4 my_vUv;
      ${e.vertexShader}`,e.vertexShader=e.vertexShader.replace("#include <project_vertex>",`#include <project_vertex>
        my_vUv = textureMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );`),e.fragmentShader=`
        uniform sampler2D tDiffuse;
        uniform sampler2D tDiffuseBlur;
        uniform sampler2D tDepth;
        uniform sampler2D distortionMap;
        uniform float distortion;
        uniform float cameraNear;
			  uniform float cameraFar;
        uniform bool hasBlur;
        uniform float mixBlur;
        uniform float mirror;
        uniform float mixStrength;
        uniform float minDepthThreshold;
        uniform float maxDepthThreshold;
        uniform float mixContrast;
        uniform float depthScale;
        uniform float depthToBlurRatioBias;
        varying vec4 my_vUv;
        ${e.fragmentShader}`,e.fragmentShader=e.fragmentShader.replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>

      float distortionFactor = 0.0;
      #ifdef USE_DISTORTION
        distortionFactor = texture2D(distortionMap, vUv).r * distortion;
      #endif

      vec4 new_vUv = my_vUv;
      new_vUv.x += distortionFactor;
      new_vUv.y += distortionFactor;

      vec4 base = texture2DProj(tDiffuse, new_vUv);
      vec4 blur = texture2DProj(tDiffuseBlur, new_vUv);

      vec4 merge = base;

      #ifdef USE_NORMALMAP
        vec2 normal_uv = vec2(0.0);
        vec4 normalColor = texture2D(normalMap, vUv * normalScale);
        vec3 my_normal = normalize( vec3( normalColor.r * 2.0 - 1.0, normalColor.b,  normalColor.g * 2.0 - 1.0 ) );
        vec3 coord = new_vUv.xyz / new_vUv.w;
        normal_uv = coord.xy + coord.z * my_normal.xz * 0.05;
        vec4 base_normal = texture2D(tDiffuse, normal_uv);
        vec4 blur_normal = texture2D(tDiffuseBlur, normal_uv);
        merge = base_normal;
        blur = blur_normal;
      #endif

      float depthFactor = 0.0001;
      float blurFactor = 0.0;

      #ifdef USE_DEPTH
        vec4 depth = texture2DProj(tDepth, new_vUv);
        depthFactor = smoothstep(minDepthThreshold, maxDepthThreshold, 1.0-(depth.r * depth.a));
        depthFactor *= depthScale;
        depthFactor = max(0.0001, min(1.0, depthFactor));

        #ifdef USE_BLUR
          blur = blur * min(1.0, depthFactor + depthToBlurRatioBias);
          merge = merge * min(1.0, depthFactor + 0.5);
        #else
          merge = merge * depthFactor;
        #endif

      #endif

      float reflectorRoughnessFactor = roughness;
      #ifdef USE_ROUGHNESSMAP
        vec4 reflectorTexelRoughness = texture2D( roughnessMap, vUv );
        reflectorRoughnessFactor *= reflectorTexelRoughness.g;
      #endif

      #ifdef USE_BLUR
        blurFactor = min(1.0, mixBlur * reflectorRoughnessFactor);
        merge = mix(merge, blur, blurFactor);
      #endif

      vec4 newMerge = vec4(0.0, 0.0, 0.0, 1.0);
      newMerge.r = (merge.r - 0.5) * mixContrast + 0.5;
      newMerge.g = (merge.g - 0.5) * mixContrast + 0.5;
      newMerge.b = (merge.b - 0.5) * mixContrast + 0.5;

      diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror)) + newMerge.rgb * mixStrength);
      `)}get tDiffuse(){return this._tDiffuse.value}set tDiffuse(e){this._tDiffuse.value=e}get tDepth(){return this._tDepth.value}set tDepth(e){this._tDepth.value=e}get distortionMap(){return this._distortionMap.value}set distortionMap(e){this._distortionMap.value=e}get tDiffuseBlur(){return this._tDiffuseBlur.value}set tDiffuseBlur(e){this._tDiffuseBlur.value=e}get textureMatrix(){return this._textureMatrix.value}set textureMatrix(e){this._textureMatrix.value=e}get hasBlur(){return this._hasBlur.value}set hasBlur(e){this._hasBlur.value=e}get mirror(){return this._mirror.value}set mirror(e){this._mirror.value=e}get mixBlur(){return this._mixBlur.value}set mixBlur(e){this._mixBlur.value=e}get mixStrength(){return this._blurStrength.value}set mixStrength(e){this._blurStrength.value=e}get minDepthThreshold(){return this._minDepthThreshold.value}set minDepthThreshold(e){this._minDepthThreshold.value=e}get maxDepthThreshold(){return this._maxDepthThreshold.value}set maxDepthThreshold(e){this._maxDepthThreshold.value=e}get depthScale(){return this._depthScale.value}set depthScale(e){this._depthScale.value=e}get depthToBlurRatioBias(){return this._depthToBlurRatioBias.value}set depthToBlurRatioBias(e){this._depthToBlurRatioBias.value=e}get distortion(){return this._distortion.value}set distortion(e){this._distortion.value=e}get mixContrast(){return this._mixContrast.value}set mixContrast(e){this._mixContrast.value=e}}let x=r.forwardRef(({mixBlur:e=0,mixStrength:t=1,resolution:i=256,blur:n=[0,0],minDepthThreshold:s=.9,maxDepthThreshold:m=1,depthScale:d=0,depthToBlurRatioBias:f=.25,mirror:v=0,distortion:x=1,mixContrast:g=1,distortionMap:_,reflectorOffset:S=0,...T},D)=>{(0,h.extend)({MeshReflectorMaterialImpl:p});let U=(0,o.useThree)(({gl:e})=>e),M=(0,o.useThree)(({camera:e})=>e),y=(0,o.useThree)(({scene:e})=>e),B=(n=Array.isArray(n)?n:[n,n])[0]+n[1]>0,w=n[0],b=n[1],F=r.useRef(null);r.useImperativeHandle(D,()=>F.current,[]);let[R]=r.useState(()=>new u.Plane),[j]=r.useState(()=>new u.Vector3),[C]=r.useState(()=>new u.Vector3),[E]=r.useState(()=>new u.Vector3),[A]=r.useState(()=>new u.Matrix4),[P]=r.useState(()=>new u.Vector3(0,0,-1)),[I]=r.useState(()=>new u.Vector4),[L]=r.useState(()=>new u.Vector3),[V]=r.useState(()=>new u.Vector3),[z]=r.useState(()=>new u.Vector4),[k]=r.useState(()=>new u.Matrix4),[W]=r.useState(()=>new u.PerspectiveCamera),G=r.useCallback(()=>{var e;let t=F.current.parent||(null==(e=F.current)||null==(e=e.__r3f.parent)?void 0:e.object);if(!t||(C.setFromMatrixPosition(t.matrixWorld),E.setFromMatrixPosition(M.matrixWorld),A.extractRotation(t.matrixWorld),j.set(0,0,1),j.applyMatrix4(A),C.addScaledVector(j,S),L.subVectors(C,E),L.dot(j)>0))return;L.reflect(j).negate(),L.add(C),A.extractRotation(M.matrixWorld),P.set(0,0,-1),P.applyMatrix4(A),P.add(E),V.subVectors(C,P),V.reflect(j).negate(),V.add(C),W.position.copy(L),W.up.set(0,1,0),W.up.applyMatrix4(A),W.up.reflect(j),W.lookAt(V),W.far=M.far,W.updateMatrixWorld(),W.projectionMatrix.copy(M.projectionMatrix),k.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),k.multiply(W.projectionMatrix),k.multiply(W.matrixWorldInverse),k.multiply(t.matrixWorld),R.setFromNormalAndCoplanarPoint(j,C),R.applyMatrix4(W.matrixWorldInverse),I.set(R.normal.x,R.normal.y,R.normal.z,R.constant);let r=W.projectionMatrix;z.x=(Math.sign(I.x)+r.elements[8])/r.elements[0],z.y=(Math.sign(I.y)+r.elements[9])/r.elements[5],z.z=-1,z.w=(1+r.elements[10])/r.elements[14],I.multiplyScalar(2/I.dot(z)),r.elements[2]=I.x,r.elements[6]=I.y,r.elements[10]=I.z+1,r.elements[14]=I.w},[M,S]),[N,O,H,$]=r.useMemo(()=>{let r={minFilter:u.LinearFilter,magFilter:u.LinearFilter,type:u.HalfFloatType},a=new u.WebGLRenderTarget(i,i,r);a.depthBuffer=!0,a.depthTexture=new u.DepthTexture(i,i),a.depthTexture.format=u.DepthFormat,a.depthTexture.type=u.UnsignedShortType;let o=new u.WebGLRenderTarget(i,i,r),n=new c({gl:U,resolution:i,width:w,height:b,minDepthThreshold:s,maxDepthThreshold:m,depthScale:d,depthToBlurRatioBias:f}),l={mirror:v,textureMatrix:k,mixBlur:e,tDiffuse:a.texture,tDepth:a.depthTexture,tDiffuseBlur:o.texture,hasBlur:B,mixStrength:t,minDepthThreshold:s,maxDepthThreshold:m,depthScale:d,depthToBlurRatioBias:f,distortion:x,distortionMap:_,mixContrast:g,"defines-USE_BLUR":B?"":void 0,"defines-USE_DEPTH":d>0?"":void 0,"defines-USE_DISTORTION":_?"":void 0};return[a,o,n,l]},[U,w,b,k,i,v,B,e,t,s,m,d,f,x,_,g]);return(0,a.useFrame)(()=>{var e;let t=F.current.parent||(null==(e=F.current)||null==(e=e.__r3f.parent)?void 0:e.object);if(!t)return;t.visible=!1;let r=U.xr.enabled,i=U.shadowMap.autoUpdate;G(),U.xr.enabled=!1,U.shadowMap.autoUpdate=!1,U.setRenderTarget(N),U.state.buffers.depth.setMask(!0),U.autoClear||U.clear(),U.render(y,W),B&&H.render(U,N,O),U.xr.enabled=r,U.shadowMap.autoUpdate=i,t.visible=!0,U.setRenderTarget(null)}),r.createElement("meshReflectorMaterialImpl",(0,l.default)({attach:"material",key:"key"+$["defines-USE_BLUR"]+$["defines-USE_DEPTH"]+$["defines-USE_DISTORTION"],ref:F},$,T))});var g=e.i(4942),_=e.i(4904),S=e.i(26405);let T=e=>e<0?0:e>1?1:e,D=(e,t,r)=>e+(t-e)*r,U=e=>e*e*(3-2*e),M=new u.MeshStandardMaterial({color:"#3A352E",roughness:.5,metalness:.3}),y=new u.MeshStandardMaterial({color:"#0E0B08",roughness:.22,metalness:.9});function B({url:e,faceSign:i,outerRef:a,bobRef:o,shadowTex:n}){let s=i>0?-Math.PI/2:Math.PI/2;return(0,t.jsxs)("group",{ref:a,children:[(0,t.jsx)("group",{ref:o,children:(0,t.jsx)(r.Suspense,{fallback:null,children:(0,t.jsx)(g.default,{url:e,normalizeTo:1.55,seat:"bottom",rotation:[0,s,0],envMapIntensity:1.35,fallback:(0,t.jsx)("mesh",{material:M,position:[0,.45,0],children:(0,t.jsx)("boxGeometry",{args:[1,.45,.36]})})})})}),(0,t.jsxs)("mesh",{rotation:[-Math.PI/2,0,0],position:[0,.006,.02],children:[(0,t.jsx)("planeGeometry",{args:[1.5,.62]}),(0,t.jsx)("meshBasicMaterial",{map:n,transparent:!0,depthWrite:!1})]})]})}function w({scrollProgress:e,reduced:i,invalidateRef:l,reflective:h}){let m=(0,r.useRef)(null),d=(0,r.useRef)(null),f=(0,r.useRef)(null),c=(0,r.useRef)(null),v=(0,r.useRef)(null),p=(0,r.useMemo)(()=>{let e=document.createElement("canvas");e.width=e.height=128;let t=e.getContext("2d"),r=t.createRadialGradient(64,64,2,64,64,64);return r.addColorStop(0,"rgba(0,0,0,0.92)"),r.addColorStop(.45,"rgba(0,0,0,0.42)"),r.addColorStop(1,"rgba(0,0,0,0)"),t.fillStyle=r,t.fillRect(0,0,128,128),new u.CanvasTexture(e)},[]),{camera:g,invalidate:S}=(0,o.useThree)();return(0,r.useEffect)(()=>(l.current=S,S(),()=>{l.current=null}),[S,l]),(0,a.useFrame)(()=>{let t=e.current,r=U(T((t-.86)/.14));g.position.z=D(4.3,3.05,r),g.position.y=D(.9,1.08,r),g.lookAt(0,D(.62,.72,r),0);let a=T(t/.5),o=U(a),n=i?0:Math.exp(-(((t-.5)/.045)**2)),s=(i?0:.07*Math.abs(Math.sin(a*Math.PI*3)))+.05*n,l=1+.05*n,u=T((Math.min(t,.86)-.5)/.5),h=i?0:U(u)*Math.PI*5,p=D(-5,-.78,o)-.09*n,x=D(5,.78,o)+.09*n;if(m.current&&(m.current.position.x=p,m.current.rotation.y=h),f.current&&(f.current.position.x=x,f.current.rotation.y=-h),d.current&&(d.current.position.y=s,d.current.scale.setScalar(l)),c.current&&(c.current.position.y=s,c.current.scale.setScalar(l)),v.current){let e=Math.exp(-(((t-.48)/.16)**2));v.current.intensity=36+20*e}}),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("color",{attach:"background",args:["#0A0807"]}),(0,t.jsx)("fog",{attach:"fog",args:["#0A0705",4.5,12]}),(0,t.jsxs)(n.Environment,{resolution:256,frames:1,children:[(0,t.jsx)(s.Lightformer,{intensity:4.4,color:"#FFC178",position:[0,5,0],rotation:[-Math.PI/2,0,0],scale:[8,8,1]}),(0,t.jsx)(s.Lightformer,{intensity:2.8,color:"#FFE7C6",position:[0,1.8,5],scale:[8,5,1]}),(0,t.jsx)(s.Lightformer,{intensity:2.4,color:"#D7AE72",form:"ring",position:[0,3,1.5],scale:4}),(0,t.jsx)(s.Lightformer,{intensity:1.2,color:"#A38765",position:[-4,2,1],rotation:[0,Math.PI/2,0],scale:[5,5,1]}),(0,t.jsx)(s.Lightformer,{intensity:1.2,color:"#A38765",position:[4,2,1],rotation:[0,-Math.PI/2,0],scale:[5,5,1]}),(0,t.jsx)(s.Lightformer,{intensity:1,color:"#E8DAC2",position:[0,2.6,-5],scale:[9,4,1]}),(0,t.jsx)(s.Lightformer,{intensity:.7,color:"#B6C8E8",position:[0,3,-4],scale:[6,3,1]})]}),(0,t.jsx)("ambientLight",{intensity:.3,color:"#FFE2C2"}),(0,t.jsx)("spotLight",{ref:v,position:[0,5.6,1.2],angle:.64,penumbra:1,intensity:36,distance:16,decay:2,color:"#FFE3C2"}),(0,t.jsxs)("mesh",{rotation:[-Math.PI/2,0,0],position:[0,0,0],material:h?void 0:y,children:[(0,t.jsx)("circleGeometry",{args:[7,48]}),h&&(0,t.jsx)(x,{resolution:128,blur:[0,0],mixBlur:0,depthScale:0,mixStrength:2.2,mirror:.78,color:"#100B08",metalness:.7,roughness:.32})]}),(0,t.jsx)(B,{url:_.ASSETS.cloudmonster,faceSign:1,outerRef:m,bobRef:d,shadowTex:p}),(0,t.jsx)(B,{url:_.ASSETS.ae1,faceSign:-1,outerRef:f,bobRef:c,shadowTex:p})]})}e.s(["default",0,function({scrollProgress:e,active:a,reduced:o,invalidateRef:n}){let[s,l]=(0,r.useState)(!1);return(0,t.jsx)(i.Canvas,{flat:!0,frameloop:a?"demand":"never",dpr:1,camera:{position:[0,.9,4.3],fov:42,near:.1,far:40},gl:{antialias:!0,alpha:!1,powerPreference:"high-performance"},shadows:!1,style:{background:"#0A0908"},"aria-hidden":"true",onCreated:({gl:e})=>{try{l(!(0,S.isIntegratedGpu)((0,S.readGpuRenderer)(e.getContext())))}catch{}},children:(0,t.jsx)(r.Suspense,{fallback:null,children:(0,t.jsx)(w,{scrollProgress:e,reduced:o,invalidateRef:n,reflective:s})})})}],9852)},53438,e=>{e.n(e.i(9852))}]);