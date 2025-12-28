import * as THREE from "three";

export class InteractionManager {
  constructor(camera, renderer) {
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.interactables = []; // List of objects to check
    this.hoveredObject = null;
    this.selectedObject = null;

    this.controlPanel = null;
    this.originalMaterials = new Map();

    this.initEvents();
  }

  setControlPanel(cp) {
    this.controlPanel = cp;
  }

  setViewManager(vm) {
    this.viewManager = vm;
  }

  initEvents() {
    window.addEventListener("mousemove", this.onMouseMove.bind(this));
    window.addEventListener("click", this.onClick.bind(this));
    window.addEventListener("dblclick", this.onDoubleClick.bind(this));

    // Track mouse down only for creating drag start point (for camera rotation check)
    window.addEventListener("mousedown", (e) => {
      this.dragStart = { x: e.clientX, y: e.clientY };
    });

    // Keydown handled in SceneManager for global shortcuts
    // window.addEventListener("keydown", ... );
  }

  setInteractables(objects) {
    this.interactables = objects;
  }

  onMouseMove(event) {
    // Normalize mouse coordinates (-1 to +1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  onClick(event) {
    // Check for Drag
    if (this.dragStart) {
      const dx = event.clientX - this.dragStart.x;
      const dy = event.clientY - this.dragStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) return; // Ignore drag
    }

    // 1. Raycast
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactables, true);

    // 2. Logic: "press once out in the empty space" => Deselect
    // If we hit nothing, deselect.
    // If we hit a component, DO NOTHING (User wants double tap for selection).

    if (intersects.length === 0) {
      console.log("InteractionManager: Click Empty -> Deselect");
      if (this.controlPanel) this.controlPanel.setDebug("CLICK EMPTY: RESET");
      this.deselectAll();
    } else {
      // Hit something, but ignore single click as per request
      console.log("InteractionManager: Single click ignored (waiting for double tap)");
    }
  }

  onDoubleClick(event) {
    // 1. Raycast
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactables, true);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const component = this.findComponentParent(hit);

      if (component) {
        console.log("InteractionManager: Double Click on", component.name);

        if (this.selectedObject !== component) {
          // Case 1: "component selection = double tap"
          // Not selected yet, so Select & Isolate
          this.selectObject(component);
        } else {
          // Case 2: "detailed component splitting ( double tap again)"
          // Already selected, so Explode Sub-Components
          if (this.viewManager) {
            this.viewManager.explodeSubComponent(this.selectedObject);
            if (this.controlPanel) this.controlPanel.setDebug("ACTION: SUB-EXPLODE");
          }
        }
      }
    }
  }

  deselectAll() {
    this.selectedObject = null;
    console.log("Deselected");

    if (this.controlPanel) {
      this.controlPanel.showMainView();
      this.controlPanel.setDebug("No Selection");
    }

    if (this.viewManager) {
      this.viewManager.resetIsolation();

      // Also reset sub-explosion if any
      if (typeof this.viewManager.resetSubExplosion === 'function') {
        this.viewManager.restoreSubPositions(); // Snap back
        this.viewManager.resetSubExplosion();
      }
    }
  }

  setFocusHandler(fn) {
    this.focusHandler = fn;
  }

  selectObject(object) {
    this.selectedObject = object;
    console.log("Selected:", object.name);

    if (this.controlPanel) {
      // Pass the object so the console can manipulate it
      this.controlPanel.showComponentView(object.name, object);
    }

    if (this.viewManager) {
      this.viewManager.isolate(object);
    }

    if (this.focusHandler) {
      this.focusHandler(object);
    }
  }

  // ...

  update() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactables, true);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      // Debug first hit
      // console.log("Hit:", hitMesh.name, hitMesh.uuid);

      const component = this.findComponentParent(hitMesh);
      if (component) {
        if (component !== this.hoveredObject) {
          this.clearHover();
          this.hoveredObject = component;
          this.applyHover(component);
          // console.log("Hovering:", component.name);
        }
      } else {
        // Hit something but no component parent found?
        // console.log("Hit non-component mesh:", hitMesh.name);
      }
    } else {
      if (this.hoveredObject) {
        this.clearHover();
        this.hoveredObject = null;
      }
    }
  }

  findComponentParent(mesh) {
    // Traverse up until we find a named component in our interactables list
    // Or just check if the parent is in the list
    let current = mesh;
    while (current) {
      if (this.interactables.includes(current)) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  applyHover(object) {
    // Highlight effect: Emissive Glow
    // We need to apply this to ALL meshes inside the group
    object.traverse((child) => {
      if (child.isMesh && child.material) {
        // Safe check for Emissive property (Standard/Physical materials)
        // ShaderMaterials (HeatMap) do not have emissive.
        if (!child.material.emissive) return;

        // Store original state if not exists
        if (!this.originalMaterials.has(child.uuid)) {
          // Defensive Check
          if (Array.isArray(child.material)) return; // Skip multi-mat

          this.originalMaterials.set(child.uuid, {
            emissive: child.material.emissive.clone(),
            color: child.material.color ? child.material.color.clone() : new THREE.Color()
          });
        }

        // Apply Highlight
        child.material.emissive.setHex(0x333333); // Subtle glow
      }
    });
  }

  clearHover() {
    if (!this.hoveredObject) return;

    this.hoveredObject.traverse((child) => {
      if (child.isMesh && child.material && this.originalMaterials.has(child.uuid)) {
        const original = this.originalMaterials.get(child.uuid);

        // Only restore if current material supports emissive
        if (child.material.emissive) {
          child.material.emissive.copy(original.emissive);
        }
      }
    });

    // Clear map? No, keep cache.
  }
}
