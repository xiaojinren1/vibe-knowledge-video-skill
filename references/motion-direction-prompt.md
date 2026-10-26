# Motion Direction Prompt

Use this checklist when a knowledge video contains a recognizable moving person, vehicle, animal, machine, or product.

## Prompt structure

Describe the shot in this order:

1. **Subject fidelity** — Name the subject, viewing angle, silhouette, proportions, defining parts, materials, and articulation. When a reference is supplied, first extract visual anchors rather than improvising the geometry. For a person, mark head, neck, shoulder, elbow, hand, hip, knee, ankle, and foot; for a machine, mark axles, frame joints, controls, supports, and propulsion parts.
2. **Contact geometry** — Declare one numeric ground, water, rail, or support anchor and derive every scene position from it. State which parts touch it, remain above it, or may be partially occluded by it. Do not hand-tune unrelated Y coordinates in different scenes.
3. **Primary motion** — Define screen-space direction, speed, acceleration, and whether the camera follows the subject.
4. **Coupled motion** — Tie wheels, tracks, propellers, limbs, suspension, body pitch, spray, dust, wakes, shadows, and parallax to the same speed signal. Avoid decorative motion unrelated to cause and effect.
5. **Explanatory overlays** — Add labels, arrows, cutaways, or numbers while the subject continues moving. Keep overlays clear of the subject and subtitles.
6. **Continuity** — Preserve subject scale, orientation, colors, proportions, contact line, and motion direction between scenes.
7. **Negative constraints** — Explicitly reject compressed anatomy, stretched limbs, disconnected joints, frozen wheels, sliding without rotation, floating above the surface, sinking below the surface, geometry intersections, and placeholder-level line art.

## Reusable Chinese prompt

> 以连续运动镜头呈现主体，不要做成静态贴图。先从参考图提取主体关节点与结构锚点：人物至少标出头、颈、肩、肘、手、髋、膝、踝和脚；车辆至少标出轮轴、车架、座位、车把、支架与推进部件。人物应形成真实动作链，例如骑手臀部落座、身体前倾、肘部弯曲、双手握把、膝盖贴近车身、双脚落在脚踏。禁止用一个色块躯干加几条直线冒充完整人物。主体必须保持可识别且比例可信，关键部件和连接关系完整。建立唯一的地面或水面数值锚点，所有场景都用同一公式定位，明确哪些部件贴着表面、哪些位于表面上方、哪些允许被局部遮挡，避免整车下沉、悬空或穿模。若有滑板、浮筒或支架，必须画出它们与车轮或车架的连接结构，不能只在底部放两条悬空曲线。主体横向移动时，轮胎、履带、螺旋桨或肢体动作必须按同一速度参数同步；加入轻微悬挂起伏、车身俯仰、水花或尘土以及背景视差，使运动具有重量感。讲解文字、力学箭头和数据在主体持续运动时出现，不要让画面退化成几张静态示意图。各场景保持主体大小、方向、颜色、接触线和运动逻辑一致。

## Water-vehicle example

Set one numeric waterline anchor for the whole sequence. Define one local contact point on the vehicle and compute every scene's vertical position as waterline minus scaled contact point. Put each ski directly beneath its wheel, draw visible mounting struts back to the axle or frame, and align the ski's running surface with the waterline. Allow only the intended propulsion element to approach or cross the line. Use spray and wake to communicate water contact instead of drawing the whole chassis inside the water. Rotate wheels from frame count and travel speed, add small deterministic pitch and bobbing, and keep the vehicle moving while lift, thrust, drag, and control labels appear.
