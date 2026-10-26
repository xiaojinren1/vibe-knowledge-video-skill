# Motion Direction Prompt

Use this checklist when a knowledge video contains a recognizable moving person, vehicle, animal, machine, or product.

## Prompt structure

Describe the shot in this order:

1. **Subject fidelity** — Name the subject, viewing angle, silhouette, proportions, defining parts, materials, and articulation. Require anatomically or mechanically credible connections.
2. **Contact geometry** — Declare the exact ground, water, rail, or support line. State which parts touch it, remain above it, or may be partially occluded by it.
3. **Primary motion** — Define screen-space direction, speed, acceleration, and whether the camera follows the subject.
4. **Coupled motion** — Tie wheels, tracks, propellers, limbs, suspension, body pitch, spray, dust, wakes, shadows, and parallax to the same speed signal. Avoid decorative motion unrelated to cause and effect.
5. **Explanatory overlays** — Add labels, arrows, cutaways, or numbers while the subject continues moving. Keep overlays clear of the subject and subtitles.
6. **Continuity** — Preserve subject scale, orientation, colors, proportions, contact line, and motion direction between scenes.
7. **Negative constraints** — Explicitly reject compressed anatomy, stretched limbs, disconnected joints, frozen wheels, sliding without rotation, floating above the surface, sinking below the surface, geometry intersections, and placeholder-level line art.

## Reusable Chinese prompt

> 以连续运动镜头呈现主体，不要做成静态贴图。主体必须保持可识别且比例可信，关键部件和连接关系完整。先确定地面或水面的接触线：明确哪些部件贴着表面、哪些位于表面上方、哪些允许被局部遮挡，避免整车下沉、悬空或穿模。主体横向移动时，轮胎、履带、螺旋桨或肢体动作必须按同一速度参数同步；加入轻微悬挂起伏、车身俯仰、水花或尘土以及背景视差，使运动具有重量感。讲解文字、力学箭头和数据在主体持续运动时出现，不要让画面退化成几张静态示意图。人物不得压扁或拉长，关节连接自然；轮子不得只平移不转动。各场景保持主体大小、方向、颜色和运动逻辑一致。

## Water-vehicle example

Set one numeric waterline for every shot. Position the lowest visible wheel or ski at that line, allowing only the intended propulsion element to approach or cross it. Use spray and wake to communicate water contact instead of drawing the whole chassis inside the water. Rotate wheels from frame count and travel speed, add small deterministic pitch and bobbing, and keep the vehicle moving while lift, thrust, drag, and control labels appear.
