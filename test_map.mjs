
class Vector3 {
  constructor(x=0, y=0, z=0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  applyQuaternion(q) { return this; } 
}
class Euler { constructor(x,y,z){} }
class Quaternion { setFromEuler() { return this; } clone() { return this; } invert() { return this; } }
const THREE = { Vector3, Euler, Quaternion };

// mapData.js - Defines the walls, furniture, and physical colliders for the level.


// 1. WALLS: Structural boundaries of the house (height = 6)
const WALLS = [
  // Back Walls (Z = -15)
  { id: "wall_back_kitchen", pos: [-15, 3, -15], size: [20, 6, 1], color: "#7aa495" }, // Sage Green (Kitchen)
  { id: "wall_back_court", pos: [0, 3, -15], size: [10, 6, 1], color: "#5c5753" },   // Exterior Slate (Courtyard)
  { id: "wall_back_bedroom", pos: [15, 3, -15], size: [20, 6, 1], color: "#b9c0cd" }, // Soft Periwinkle (Bedroom)

  // Front Wall (bottom of Hall)
  { id: "wall_front", pos: [0, 3, 25], size: [50, 6, 1], color: "#eee6dd" }, // Cozy Warm White

  // Left Walls (X = -25)
  { id: "wall_left_kitchen", pos: [-25, 3, -5], size: [1, 6, 20], color: "#7aa495" }, // Sage Green (Kitchen)
  { id: "wall_left_hall", pos: [-25, 3, 15], size: [1, 6, 20], color: "#eee6dd" },    // Cozy Warm White (Hall)

  // Right Walls (X = 25)
  { id: "wall_right_bedroom", pos: [25, 3, -5], size: [1, 6, 20], color: "#b9c0cd" }, // Soft Periwinkle (Bedroom)
  { id: "wall_right_hall", pos: [25, 3, 15], size: [1, 6, 20], color: "#eee6dd" },     // Cozy Warm White (Hall)

  // Inner Courtyard Walls
  { id: "court_left", pos: [-5, 3, -5], size: [1, 6, 20], color: "#7aa495" }, // Kitchen side
  { id: "court_right", pos: [5, 3, -5], size: [1, 6, 20], color: "#b9c0cd" }, // Bedroom side
  { id: "court_front", pos: [0, 3, 5], size: [10, 6, 1], color: "#eee6dd" },  // Hall side

  // Kitchen - Hall Dividers (Doorway at X = -15, width = 4)
  { id: "kitchen_div_left", pos: [-21, 3, 5], size: [8, 6, 1], color: "#eee6dd" },
  { id: "kitchen_div_right", pos: [-9, 3, 5], size: [8, 6, 1], color: "#eee6dd" },

  // Bedroom - Hall Dividers (Doorway at X = 15, width = 4)
  { id: "bedroom_div_left", pos: [9, 3, 5], size: [8, 6, 1], color: "#eee6dd" },
  { id: "bedroom_div_right", pos: [21, 3, 5], size: [8, 6, 1], color: "#eee6dd" },
];

// 2. RAW FURNITURE DATA: Grouped items with 3D parts and collision boundaries
const FURNITURE_RAW = [
  // ==========================================
  // --- HALL (LIVING ROOM) ---
  // ==========================================
  
  // Existing Left Zone (Recreation)
  { id: "hall_bar_counter", type: "counter", pos: [-21, 0.6, 6.5], size: [6.0, 1.2, 1.8], color: "#3d5a80" },
  { id: "hall_bar_stool_1", type: "chair", pos: [-23, 0.4, 9.0], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  { id: "hall_bar_stool_2", type: "chair", pos: [-21, 0.4, 9.0], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  { id: "hall_bar_stool_3", type: "chair", pos: [-19, 0.4, 9.0], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  { id: "hall_bar_stool_4", type: "chair", pos: [-17, 0.4, 9.0], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  
  { id: "hall_pool_table", type: "table", pos: [-17, 0.6, 15.0], size: [5.0, 1.0, 3.0], color: "#4d7c8a" },
  { id: "hall_pool_crate", type: "wooden_crate", pos: [-17, 0.4, 15.0], size: [0.8, 0.8, 0.8], color: "#8b5a2b" },
  
  { id: "hall_bookshelf_part_1", type: "bookshelf", pos: [-13.5, 2.0, 10.0], size: [1.5, 4.0, 6.0], color: "#8d5b4c" },
  { id: "hall_bookshelf_part_2", type: "bookshelf", pos: [-13.5, 2.0, 20.0], size: [1.5, 4.0, 6.0], color: "#8d5b4c" },
  { id: "hall_left_side_table", type: "side_table", pos: [-23.5, 0.3, 15.0], size: [1.2, 0.6, 1.2], color: "#b07d62" },
  { id: "hall_left_plant", type: "plant", pos: [-22.5, 0.9, 21.0], size: [1.2, 1.8, 1.2], color: "#52796f" },
  
  // Recreation Additions / Nook
  { id: "hall_rec_desk", type: "desk", pos: [-21.0, 0.6, 20.5], size: [4.0, 1.2, 1.8], color: "#8d5b4c" },
  { id: "hall_rec_chair", type: "chair", pos: [-21.0, 0.5, 18.5], size: [0.8, 1.0, 0.8], color: "#4a5759" },
  { id: "hall_rec_desk_lamp", type: "desk_lamp", parentId: "hall_rec_desk", localPos: [-1.5, 0.9, 0.0], size: [0.6, 0.6, 0.6], color: "#fef08a" },
  { id: "hall_rec_plant", type: "plant", parentId: "hall_rec_desk", localPos: [1.8, 0.9, 0.0], size: [0.8, 1.0, 0.8], color: "#14532d" },
  { id: "hall_rec_books", type: "book_stack", parentId: "hall_rec_desk", localPos: [0.0, 0.65, 0.0], size: [0.8, 0.3, 0.6], color: "#b91c1c" },
  
  // Bookshelf Room Dividers
  { id: "hall_divider_bookshelf_l1", type: "bookshelf", pos: [-6.5, 2.0, 9.5], size: [1.5, 4.0, 6.0], color: "#8d5b4c" },
  { id: "hall_divider_bookshelf_l2", type: "bookshelf", pos: [-5.0, 2.0, 9.5], size: [1.5, 4.0, 6.0], color: "#8d5b4c" },
  
  // Entertainment Zone (Center)
  { id: "hall_sofa_main", type: "sofa_main", pos: [0, 0.5, 13.0], size: [8.0, 1.0, 2.5], color: "#4d7c8a" },
  { id: "hall_sofa_l_ext", type: "sofa_l", pos: [-4.5, 0.5, 16.5], size: [2.5, 1.0, 5.0], color: "#4d7c8a" },
  { id: "hall_sofa_r_ext", type: "sofa_l", pos: [4.5, 0.5, 16.5], size: [2.5, 1.0, 5.0], color: "#4d7c8a" },
  
  { id: "hall_cushion_1", type: "cushion", parentId: "hall_sofa_main", localPos: [-3.0, 0.65, 0.0], size: [0.8, 0.3, 0.8], color: "#f2cc8f" },
  { id: "hall_cushion_2", type: "cushion", parentId: "hall_sofa_main", localPos: [3.0, 0.65, 0.0], size: [0.8, 0.3, 0.8], color: "#e07a5f" },
  { id: "hall_cushion_3", type: "cushion", parentId: "hall_sofa_l_ext", localPos: [0.0, 0.65, -0.5], size: [0.8, 0.3, 0.8], color: "#f2cc8f" },
  { id: "hall_cushion_4", type: "cushion", parentId: "hall_sofa_r_ext", localPos: [0.0, 0.65, -0.5], size: [0.8, 0.3, 0.8], color: "#e07a5f" },
  
  { id: "hall_floor_cushion_1", type: "cushion", parentId: "hall_sofa_main", localPos: [-1.0, 0.21, 0.0], size: [0.8, 0.3, 0.8], color: "#f2cc8f" },
  { id: "hall_floor_cushion_2", type: "cushion", parentId: "hall_sofa_main", localPos: [1.0, 0.21, 0.0], size: [0.8, 0.3, 0.8], color: "#e07a5f" },
  { id: "hall_floor_cushion_3", type: "cushion", parentId: "hall_sofa_l_ext", localPos: [0.0, 0.21, 1.0], size: [0.9, 0.3, 0.9], color: "#3d5a80" },
  
  { id: "hall_coffee_table", type: "coffee_table", pos: [0, 0.3, 18.5], size: [4.0, 0.6, 3.0], color: "#b07d62" },
  { id: "hall_coffee_mug", type: "mug", parentId: "hall_coffee_table", localPos: [-0.8, 0.45, 0.0], size: [0.3, 0.3, 0.3], color: "#be123c" },
  { id: "hall_coffee_books", type: "book_stack", parentId: "hall_coffee_table", localPos: [0.8, 0.45, 0.0], size: [0.8, 0.3, 0.6], color: "#4d7c8a" },
  
  { id: "hall_tv_stand", type: "tv_stand", pos: [0, 0.4, 23.8], size: [8.0, 0.8, 1.4], color: "#6b584c" },
  { id: "hall_tv_screen", type: "tv_screen", parentId: "hall_tv_stand", localPos: [0.0, 0.0, 0.0], size: [2.2, 1.3, 0.12], color: "#18181b" },
  { id: "hall_tv_books", type: "book_stack", parentId: "hall_tv_stand", localPos: [-3.0, 0.0, 0.0], size: [0.6, 0.3, 0.8], color: "#8d5b4c" },
  { id: "hall_tv_speaker_l", type: "box", parentId: "hall_tv_stand", localPos: [-2.0, 0.0, 0.0], size: [0.5, 0.8, 0.5], color: "#18181b" },
  { id: "hall_tv_speaker_r", type: "box", parentId: "hall_tv_stand", localPos: [2.0, 0.0, 0.0], size: [0.5, 0.8, 0.5], color: "#18181b" },
  { id: "hall_tv_console_device", type: "box", parentId: "hall_tv_stand", localPos: [0.0, 0.0, 0.4], size: [0.8, 0.15, 0.8], color: "#27272a" },
  
  { id: "hall_sofa_side_table_l", type: "side_table", pos: [-6.2, 0.3, 13.0], size: [1.0, 0.6, 1.0], color: "#6b584c" },
  { id: "hall_sofa_side_lamp_l", type: "desk_lamp", parentId: "hall_sofa_side_table_l", localPos: [0.0, 0.65, 0.0], size: [0.5, 0.7, 0.5], color: "#fef08a" },
  { id: "hall_sofa_side_table_r", type: "side_table", pos: [6.2, 0.3, 13.0], size: [1.0, 0.6, 1.0], color: "#6b584c" },
  { id: "hall_sofa_side_plant_r", type: "plant", parentId: "hall_sofa_side_table_r", localPos: [0.0, 0.5, 0.0], size: [0.6, 0.8, 0.6], color: "#52796f" },
  
  { id: "hall_lamp_1", type: "lamp", pos: [-8, 1.8, 23.5], size: [0.6, 3.6, 0.6], color: "#ffedd5" },
  { id: "hall_lamp_2", type: "lamp", pos: [8, 1.8, 23.5], size: [0.6, 3.6, 0.6], color: "#ffedd5" },
  { id: "hall_plant_center_l", type: "plant", pos: [-8, 0.9, 11.0], size: [1.2, 1.8, 1.2], color: "#52796f" },
  { id: "hall_plant_center_r", type: "plant", pos: [8, 0.9, 11.0], size: [1.2, 1.8, 1.2], color: "#52796f" },
  
  // Bookshelf Room Dividers
  { id: "hall_divider_bookshelf_r1", type: "bookshelf", pos: [6.5, 2.0, 9.5], size: [1.5, 4.0, 6.0], color: "#8d5b4c" },
  { id: "hall_divider_bookshelf_r2", type: "bookshelf", pos: [5.0, 2.0, 9.5], size: [1.5, 4.0, 6.0], color: "#8d5b4c" },
  
  // Library Zone (Right)
  { id: "hall_bookshelf_1", type: "bookshelf", pos: [23.5, 2.0, 10.0], size: [1.5, 4.0, 6.0], color: "#8d5b4c" },
  { id: "hall_bookshelf_2", type: "bookshelf", pos: [23.5, 2.0, 20.0], size: [1.5, 4.0, 6.0], color: "#8d5b4c" },
  { id: "hall_bookshelf_3", type: "bookshelf", pos: [16.5, 2.0, 10.5], size: [6.0, 4.0, 1.5], color: "#8d5b4c" },
  { id: "hall_bookshelf_4", type: "bookshelf", pos: [16.5, 2.0, 19.5], size: [6.0, 4.0, 1.5], color: "#8d5b4c" },
  
  { id: "hall_armchair_1", type: "sofa_single", pos: [15.0, 0.5, 15.0], size: [1.8, 1.0, 1.8], color: "#e0a96d" },
  { id: "hall_armchair_1_cushion", type: "cushion", parentId: "hall_armchair_1", localPos: [0, 0.6, 0], size: [0.6, 0.2, 0.6], color: "#f2cc8f" },
  { id: "hall_armchair_2", type: "sofa_single", pos: [18.0, 0.5, 15.0], size: [1.8, 1.0, 1.8], color: "#768e82" },
  { id: "hall_armchair_2_cushion", type: "cushion", parentId: "hall_armchair_2", localPos: [0, 0.6, 0], size: [0.6, 0.2, 0.6], color: "#e07a5f" },
  { id: "hall_reading_side_table", type: "side_table", pos: [16.5, 0.3, 15.0], size: [1.2, 0.6, 1.2], color: "#b07d62" },
  { id: "hall_reading_lamp", type: "lamp", pos: [16.5, 1.8, 13.5], size: [0.6, 3.6, 0.6], color: "#ffedd5" },
  { id: "hall_library_plant", type: "plant", pos: [23.5, 0.6, 15.0], size: [1.0, 1.2, 1.0], color: "#14532d" },
  
  // Library Zone Long Table / Study Nook
  { id: "hall_library_table", type: "table", pos: [16.5, 0.5, 23.5], size: [5.0, 1.0, 2.2], color: "#d4a373" },
  { id: "hall_library_chair_1", type: "chair", pos: [14.5, 0.4, 23.5], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  { id: "hall_library_chair_2", type: "chair", pos: [18.5, 0.4, 23.5], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  { id: "hall_library_chair_3", type: "chair", pos: [16.5, 0.4, 21.8], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  { id: "hall_library_chair_4", type: "chair", pos: [16.5, 0.4, 25.2], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  { id: "hall_library_table_books", type: "book_stack", parentId: "hall_library_table", localPos: [0.0, 0.65, 0.0], size: [0.8, 0.3, 0.6], color: "#b45309" },
  
  // Dividers & Entry Decor
  { id: "hall_console_center", type: "coffee_table", pos: [0, 0.5, 6.2], size: [5.0, 1.0, 1.4], color: "#b07d62" },
  { id: "hall_console_center_lamp", type: "desk_lamp", parentId: "hall_console_center", localPos: [0.0, 0.7, 0.0], size: [0.5, 0.7, 0.5], color: "#ffedd5" },
  
  { id: "hall_console_left", type: "coffee_table", pos: [-9, 0.5, 6.2], size: [4.0, 1.0, 1.4], color: "#b07d62" },
  { id: "hall_console_left_plant", type: "plant", parentId: "hall_console_left", localPos: [0.0, 0.6, 0.0], size: [0.6, 0.8, 0.6], color: "#2e7d32" },
  
  { id: "hall_console_right", type: "coffee_table", pos: [9, 0.5, 6.2], size: [4.0, 1.0, 1.4], color: "#b07d62" },
  { id: "hall_console_right_books", type: "book_stack", parentId: "hall_console_right", localPos: [0.0, 0.65, 0.0], size: [0.8, 0.3, 0.6], color: "#4a3728" },
  
  // Corner Storage / Box Clusters
  { id: "hall_box_l1", type: "wooden_crate", pos: [-23.0, 0.4, 23.0], size: [1.0, 0.8, 1.0], color: "#8b5a2b" },
  { id: "hall_box_l2", type: "wooden_crate", pos: [-23.0, 1.2, 23.0], size: [0.9, 0.8, 0.9], color: "#a87a55" },
  { id: "hall_box_l3", type: "cardboard_box", pos: [-24.2, 0.35, 24.2], size: [0.8, 0.7, 0.8], color: "#c6a07c" },
  { id: "hall_box_l4", type: "cardboard_box", pos: [-24.2, 0.3, 22.0], size: [0.7, 0.6, 0.7], color: "#b58f6d" },
  { id: "hall_box_l5", type: "cardboard_box", pos: [-22.0, 0.3, 24.2], size: [0.7, 0.6, 0.7], color: "#b58f6d" },
  { id: "hall_box_l6", type: "cardboard_box", pos: [-22.0, 0.9, 24.2], size: [0.6, 0.5, 0.6], color: "#c6a07c" },
  { id: "hall_trash_l", type: "trash_bin", pos: [-24.0, 0.4, 8.0], size: [0.8, 0.8, 0.8], color: "#71717a" },
  
  { id: "hall_box_r1", type: "wooden_crate", pos: [12.5, 0.4, 10.0], size: [0.8, 0.8, 0.8], color: "#8b5a2b" },
  { id: "hall_box_r2", type: "cardboard_box", pos: [12.5, 1.15, 10.0], size: [0.7, 0.7, 0.7], color: "#c6a07c" },
  { id: "hall_basket_r", type: "laundry_basket", pos: [23.5, 0.5, 23.5], size: [1.0, 1.0, 1.0], color: "#d4a373" },
  { id: "hall_box_r3", type: "cardboard_box", pos: [21.8, 0.35, 23.8], size: [0.8, 0.7, 0.8], color: "#c6a07c" },

  // ==========================================
  // --- KITCHEN ---
  // ==========================================
  
  { id: "kitchen_counter_left_back", type: "counter", pos: [-24.0, 0.6, -10.0], size: [1.8, 1.2, 8.0], color: "#456a7b" },
  { id: "kitchen_counter_left_front", type: "counter", pos: [-24.0, 0.6, 1.0], size: [1.8, 1.2, 8.0], color: "#456a7b" },
  { id: "kitchen_counter_back_l", type: "counter", pos: [-20.0, 0.6, -14.0], size: [6.0, 1.2, 1.8], color: "#456a7b" },
  { id: "kitchen_counter_back_r", type: "counter", pos: [-9.0, 0.6, -14.0], size: [6.0, 1.2, 1.8], color: "#456a7b" },
  { id: "kitchen_fridge", type: "fridge", pos: [-23.8, 1.6, -5.0], size: [2.2, 3.2, 2.2], color: "#e07a5f" },
  { id: "kitchen_microwave", type: "microwave", pos: [-20.0, 1.6, -14.0], size: [1.5, 0.8, 1.2], color: "#27272a" },
  { id: "kitchen_toaster", type: "toaster", pos: [-24.0, 1.5, -9.0], size: [0.8, 0.6, 0.8], color: "#d1d5db" },
  { id: "kitchen_blender", type: "blender", pos: [-24.0, 1.6, 2.0], size: [0.8, 0.8, 0.8], color: "#ef4444" },
  { id: "kitchen_coffee_maker", type: "coffee_maker", pos: [-9.0, 1.5, -14.0], size: [0.8, 0.6, 0.8], color: "#18181b" },
  
  // Kitchen Prep Table / Island extension
  { id: "kitchen_island", type: "kitchen_island", pos: [-14.0, 0.6, -4.0], size: [4.0, 1.2, 4.0], color: "#3d5a80" },
  { id: "kitchen_fruit_bowl", type: "fruit_bowl", parentId: "kitchen_island", localPos: [0, 0.75, 0], size: [1.2, 0.3, 1.2], color: "#e11d48" },
  { id: "kitchen_island_stool_1", type: "chair", pos: [-11.5, 0.4, -4.0], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  { id: "kitchen_island_stool_2", type: "chair", pos: [-11.5, 0.4, -5.0], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  { id: "kitchen_island_stool_3", type: "chair", pos: [-11.5, 0.4, -3.0], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  
  { id: "kitchen_prep_table", type: "table", pos: [-14.0, 0.6, -9.0], size: [4.0, 1.2, 1.8], color: "#3d5a80" },
  { id: "kitchen_prep_stool_1", type: "chair", pos: [-14.0, 0.4, -10.5], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  { id: "kitchen_prep_stool_2", type: "chair", pos: [-14.0, 0.4, -7.5], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  { id: "kitchen_prep_stool_3", type: "chair", pos: [-16.5, 0.4, -9.0], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  { id: "kitchen_prep_stool_4", type: "chair", pos: [-11.5, 0.4, -9.0], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  
  // Dining area
  { id: "kitchen_table", type: "table", pos: [-15.0, 0.5, 1.5], size: [5.0, 1.0, 3.0], color: "#d4a373" },
  { id: "kitchen_mug_1", type: "mug", parentId: "kitchen_table", localPos: [0.0, 0.65, -0.5], size: [0.4, 0.3, 0.4], color: "#be123c" },
  { id: "kitchen_mug_2", type: "mug", parentId: "kitchen_table", localPos: [1.0, 0.65, 0.5], size: [0.4, 0.3, 0.4], color: "#0369a1" },
  { id: "kitchen_mug_3", type: "mug", parentId: "kitchen_table", localPos: [-0.5, 0.65, 1.0], size: [0.4, 0.3, 0.4], color: "#16a34a" },
  { id: "kitchen_table_bowl", type: "fruit_bowl", parentId: "kitchen_table", localPos: [0.0, 0.6, 0.0], size: [1.0, 0.2, 1.0], color: "#a8a29e" },
  
  { id: "kitchen_chair_1", type: "chair", pos: [-18.0, 0.4, 1.5], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  { id: "kitchen_chair_2", type: "chair", pos: [-12.0, 0.4, 1.5], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  { id: "kitchen_chair_3", type: "chair", pos: [-15.0, 0.4, -0.5], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  { id: "kitchen_chair_4", type: "chair", pos: [-15.0, 0.4, 3.5], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  { id: "kitchen_chair_5", type: "chair", pos: [-18.0, 0.4, -0.5], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  
  // Cozy breakfast nook bench + table
  { id: "kitchen_nook_bench", type: "sofa_main", pos: [-21.0, 0.5, 4.0], size: [6.0, 1.0, 1.8], color: "#e0a96d" },
  { id: "kitchen_nook_table", type: "coffee_table", pos: [-21.0, 0.3, 1.5], size: [4.0, 0.6, 1.8], color: "#d4a373" },
  { id: "kitchen_nook_chair", type: "chair", pos: [-17.5, 0.4, 1.5], size: [0.8, 0.8, 0.8], color: "#4a5759" },
  
  // Recycling / Trash station
  { id: "kitchen_trash_bin", type: "trash_bin", pos: [-7.5, 0.5, -12.0], size: [1.0, 1.0, 1.0], color: "#71717a" },
  { id: "kitchen_trash_bin_green", type: "trash_bin", pos: [-7.5, 0.5, -10.8], size: [1.0, 1.0, 1.0], color: "#52796f" },
  { id: "kitchen_trash_bin_orange", type: "trash_bin", pos: [-7.5, 0.5, -9.6], size: [1.0, 1.0, 1.0], color: "#b45309" },
  
  // Pantry cupboards
  { id: "kitchen_pantry_1", type: "wardrobe", pos: [-6.2, 1.8, -10.0], size: [1.4, 3.6, 4.0], color: "#3d5a80" },
  { id: "kitchen_pantry_2", type: "wardrobe", pos: [-6.2, 1.8, -5.0], size: [1.4, 3.6, 4.0], color: "#3d5a80" },
  { id: "kitchen_pantry_3", type: "wardrobe", pos: [-6.2, 1.8, 0.0], size: [1.4, 3.6, 4.0], color: "#3d5a80" },
  { id: "kitchen_pantry_4", type: "wardrobe", pos: [-6.2, 1.8, 4.0], size: [1.4, 3.6, 2.0], color: "#3d5a80" },
  
  // Wall shelves & accessories
  { id: "kitchen_wall_shelf_1", type: "wall_shelf", pos: [-24.2, 3.5, -2], size: [0.6, 0.1, 8.0], color: "#d4a373" },
  { id: "kitchen_wall_shelf_2", type: "wall_shelf", pos: [-14.5, 3.5, -14.2], size: [12.0, 0.1, 0.6], color: "#d4a373" },
  { id: "kitchen_shelf_plant", type: "plant", parentId: "kitchen_wall_shelf_1", localPos: [0, 0.3, 0.0], size: [0.4, 0.5, 0.4], color: "#4d7c58" },
  { id: "kitchen_shelf_mug", type: "mug", parentId: "kitchen_wall_shelf_1", localPos: [0, 0.2, -2.0], size: [0.3, 0.3, 0.3], color: "#3b82f6" },
  { id: "kitchen_counter_plates", type: "box", pos: [-17.0, 1.35, -14.0], size: [0.8, 0.3, 0.8], color: "#f1f5f9" },
  
  // Corner Clutter Stacks
  { id: "kitchen_box_l1", type: "wooden_crate", pos: [-23.5, 0.4, -2.5], size: [1.0, 0.8, 1.0], color: "#8b5a2b" },
  { id: "kitchen_box_l2", type: "wooden_crate", pos: [-23.5, 1.2, -2.5], size: [0.9, 0.8, 0.9], color: "#a87a55" },
  { id: "kitchen_box_l3", type: "cardboard_box", pos: [-23.5, 0.35, -0.5], size: [0.8, 0.7, 0.8], color: "#c6a07c" },
  
  { id: "kitchen_box_r1", type: "cardboard_box", pos: [-8.5, 0.35, -12.5], size: [0.8, 0.7, 0.8], color: "#c6a07c" },
  { id: "kitchen_box_r2", type: "cardboard_box", pos: [-8.5, 1.0, -12.5], size: [0.7, 0.6, 0.7], color: "#b58f6d" },

  // ==========================================
  // --- BEDROOM ---
  // ==========================================
  { id: "bedroom_headboard", type: "headboard", pos: [15.0, 1.1, -14.3], size: [6.4, 2.2, 0.6], color: "#5c4033" },
  { id: "bedroom_bed", type: "bed", pos: [15.0, 0.5, -10.0], size: [6.0, 1.2, 8.0], color: "#b05055" },
  { id: "bedroom_nightstand_left", type: "nightstand", pos: [11.2, 0.45, -13.5], size: [1.2, 0.9, 1.2], color: "#5c4033" },
  { id: "bedroom_nightstand_right", type: "nightstand", pos: [18.8, 0.45, -13.5], size: [1.2, 0.9, 1.2], color: "#5c4033" },
  
  { id: "bedroom_lamp_ns", type: "desk_lamp", parentId: "bedroom_nightstand_left", localPos: [0, 0.8, 0], size: [0.6, 0.6, 0.6], color: "#fef08a" },
  { id: "bedroom_lamp_ns_r", type: "desk_lamp", parentId: "bedroom_nightstand_right", localPos: [0, 0.8, 0], size: [0.6, 0.6, 0.6], color: "#fef08a" },
  
  { id: "bedroom_bed_bench", type: "coffee_table", pos: [15.0, 0.4, -5.0], size: [5.5, 0.8, 1.2], color: "#5c4033" },
  
  // Single study desk along right wall
  { id: "bedroom_desk", type: "desk", pos: [22.8, 0.6, -5.0], size: [2.2, 1.2, 4.0], color: "#8d5b4c" },
  { id: "bedroom_chair", type: "chair", pos: [20.0, 0.5, -5.0], size: [0.8, 1.0, 0.8], color: "#4a5759" },
  
  { id: "bedroom_desk_lamp", type: "desk_lamp", parentId: "bedroom_desk", localPos: [0.0, 0.9, -1.0], size: [0.6, 0.6, 0.6], color: "#fef08a" },
  { id: "bedroom_desk_books", type: "book_stack", parentId: "bedroom_desk", localPos: [0.0, 0.65, 1.2], size: [0.6, 0.3, 0.5], color: "#b45309" },
  { id: "bedroom_desk_mug", type: "mug", parentId: "bedroom_desk", localPos: [0.0, 0.65, -0.2], size: [0.4, 0.3, 0.4], color: "#0284c7" },
  
  // Bookshelves & Wardrobes (Bookshelf against right wall)
  { id: "bedroom_bookshelf", type: "bookshelf", pos: [23.5, 2.0, 1.0], size: [1.5, 4.0, 3.5], color: "#5c4033" },
  { id: "bedroom_bookshelf_box", type: "cardboard_box", parentId: "bedroom_bookshelf", localPos: [0.0, 2.2, 0.0], size: [0.8, 0.4, 0.8], color: "#c6a07c" },
  
  { id: "bedroom_wardrobe_1", type: "wardrobe", pos: [6.5, 2.0, -10.0], size: [2.5, 4.0, 4.5], color: "#5c4033" },
  { id: "bedroom_wardrobe_2", type: "wardrobe", pos: [6.5, 2.0, -5.0], size: [2.5, 4.0, 4.5], color: "#5c4033" },
  { id: "bedroom_wardrobe_3", type: "wardrobe", pos: [6.5, 2.0, 0.0], size: [2.5, 4.0, 4.5], color: "#5c4033" },
  { id: "bedroom_wardrobe_4", type: "wardrobe", pos: [6.5, 2.0, 5.0], size: [2.5, 4.0, 4.0], color: "#5c4033" },
  
  // Lounge corner (Loveseat placed against divider wall on right)
  { id: "bedroom_loveseat", type: "sofa_main", pos: [20.0, 0.5, 3.5], size: [4.5, 1.0, 2.2], color: "#e0a96d" },
  { id: "bedroom_loveseat_c1", type: "cushion", parentId: "bedroom_loveseat", localPos: [-1.0, 0.6, 0.0], size: [0.7, 0.2, 0.7], color: "#e07a5f" },
  { id: "bedroom_loveseat_c2", type: "cushion", parentId: "bedroom_loveseat", localPos: [1.0, 0.6, 0.0], size: [0.7, 0.2, 0.7], color: "#f2cc8f" },
  
  { id: "bedroom_coffee_table", type: "coffee_table", pos: [20.0, 0.3, 0.5], size: [3.0, 0.6, 1.6], color: "#5c4033" },
  { id: "bedroom_table_mug", type: "mug", parentId: "bedroom_coffee_table", localPos: [0.0, 0.4, 0.0], size: [0.3, 0.3, 0.3], color: "#16a34a" },
  { id: "bedroom_table_plant", type: "plant", parentId: "bedroom_coffee_table", localPos: [0.8, 0.4, 0.0], size: [0.5, 0.6, 0.5], color: "#52796f" },
  
  { id: "bedroom_armchair", type: "sofa_single", pos: [10.5, 0.5, -1.0], size: [1.8, 1.0, 1.8], color: "#768e82" },
  { id: "bedroom_floor_lamp", type: "lamp", pos: [11.0, 1.8, 3.0], size: [0.6, 3.6, 0.6], color: "#ffedd5" },
  
  // Clutter items & decoration plants
  { id: "bedroom_wardrobe_box_1", type: "cardboard_box", pos: [9.5, 0.4, 3.5], size: [0.9, 0.8, 0.9], color: "#c6a07c" },
  { id: "bedroom_wardrobe_box_2", type: "cardboard_box", pos: [9.5, 1.1, 3.5], size: [0.8, 0.7, 0.8], color: "#b58f6d" },
  { id: "bedroom_wardrobe_box_3", type: "cardboard_box", pos: [9.5, 0.35, 1.5], size: [0.8, 0.7, 0.8], color: "#c6a07c" },
  { id: "bedroom_laundry_basket", type: "laundry_basket", pos: [9.5, 0.5, -9.0], size: [0.9, 1.0, 0.9], color: "#7c2d12" },
  
  { id: "bedroom_laundry_basket_2", type: "laundry_basket", pos: [22.5, 0.6, -11.0], size: [1.2, 1.2, 1.2], color: "#a8a29e" },
  { id: "bedroom_laundry_basket_3", type: "laundry_basket", pos: [22.5, 0.5, 4.0], size: [0.9, 1.0, 0.9], color: "#a8a29e" },
  
  { id: "bedroom_box_r1", type: "cardboard_box", pos: [22.5, 0.4, -13.5], size: [0.9, 0.8, 0.9], color: "#c6a07c" },
  { id: "bedroom_box_r2", type: "cardboard_box", pos: [22.5, 1.15, -13.5], size: [0.8, 0.7, 0.8], color: "#c6a07c" },
  { id: "bedroom_crate_r1", type: "wooden_crate", pos: [23.8, 0.4, -10.5], size: [0.9, 0.8, 0.9], color: "#8b5a2b" },
  
  { id: "bedroom_floor_cushion_1", type: "cushion", parentId: "bedroom_bed", localPos: [0.0, 0.4, 1.5], size: [0.8, 0.3, 0.8], color: "#f2cc8f" },
  { id: "bedroom_floor_cushion_2", type: "cushion", parentId: "bedroom_armchair", localPos: [0.0, 0.21, 0.0], size: [0.8, 0.3, 0.8], color: "#e07a5f" },
  
  { id: "bedroom_floor_plant_1", type: "plant", pos: [10.0, 0.9, -4.5], size: [1.2, 1.8, 1.2], color: "#52796f" },
  { id: "bedroom_floor_plant_2", type: "plant", pos: [20.0, 0.9, 4.0], size: [1.0, 1.4, 1.0], color: "#14532d" },
  { id: "bedroom_floor_plant_3", type: "plant", pos: [8.5, 0.6, 0.0], size: [0.9, 1.2, 0.9], color: "#52796f" },
  
  { id: "bedroom_wall_shelf_1", type: "wall_shelf", pos: [24.2, 3.5, -5], size: [0.6, 0.1, 3.0], color: "#5c4033" },
  { id: "bedroom_wall_shelf_2", type: "wall_shelf", pos: [15, 3.5, -13.2], size: [4.5, 0.1, 0.6], color: "#5c4033" },
  { id: "bedroom_toy_1", type: "toy", pos: [24.2, 3.75, -5], size: [0.4, 0.4, 0.4], color: "#3b82f6" },
  { id: "bedroom_toy_2", type: "toy", pos: [15, 3.75, -13.2], size: [0.4, 0.4, 0.4], color: "#ec4899" },
];

// Helper to get AABB of an item
const getAABB = (item) => {
  const [w, h, d] = item.size;
  return {
    min: new THREE.Vector3(item.pos[0] - w/2, item.pos[1] - h/2, item.pos[2] - d/2),
    max: new THREE.Vector3(item.pos[0] + w/2, item.pos[1] + h/2, item.pos[2] + d/2),
    size: new THREE.Vector3(w, h, d),
    volume: w * h * d
  };
};

// Helper to check and return overlap details of two AABBs
const getOverlap = (boxA, boxB) => {
  const minX = Math.max(boxA.min.x, boxB.min.x);
  const maxX = Math.min(boxA.max.x, boxB.max.x);
  const minY = Math.max(boxA.min.y, boxB.min.y);
  const maxY = Math.min(boxA.max.y, boxB.max.y);
  const minZ = Math.max(boxA.min.z, boxB.min.z);
  const maxZ = Math.min(boxA.max.z, boxB.max.z);

  const overlapX = maxX - minX;
  const overlapY = maxY - minY;
  const overlapZ = maxZ - minZ;

  if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
    return {
      x: overlapX,
      y: overlapY,
      z: overlapZ,
      volume: overlapX * overlapY * overlapZ
    };
  }
  return null;
};

const ANCHORED_TYPES = ["table", "desk", "bed", "sofa_main", "sofa_single", "sofa_l", "bookshelf", "wardrobe", "counter", "kitchen_island", "fridge", "tv_stand", "headboard", "nightstand"];

const getSurfaceLocalY = (parentType, parentSize) => {
  const h = parentSize[1];
  if (parentType.startsWith("sofa")) {
    return 0.05; // Seat height in local coordinates
  }
  if (parentType === "bed") {
    return 0.4; // Mattress top height in local coordinates
  }
  return h / 2; // For tables, desks, nightstands, coffee_tables, counters, island, bookshelves, wall_shelves, wardrobes, etc.
};

const autoParentDecorations = (items) => {
  const DECORATION_TYPES = ["cushion", "mug", "book_stack", "plant", "desk_lamp", "toy", "microwave", "toaster", "blender", "coffee_maker", "fruit_bowl", "box"];
  
  for (const item of items) {
    if (item.parentId) continue;
    if (!DECORATION_TYPES.includes(item.type)) continue;
    
    // For plants, distinguish between small plant and large plant
    if (item.type === "plant" && item.size[1] >= 1.2) {
      continue;
    }
    
    let bestParent = null;
    let highestY = -999;
    
    for (const parent of items) {
      if (parent.id === item.id) continue;
      if (!ANCHORED_TYPES.includes(parent.type) && parent.type !== "wall_shelf") continue;
      
      const wP = parent.size[0];
      const dP = parent.size[2];
      // Add a tiny tolerance padding of 0.05 to the XZ bounds checks to handle edge coordinates safely
      const minXP = parent.pos[0] - wP / 2 - 0.05;
      const maxXP = parent.pos[0] + wP / 2 + 0.05;
      const minZP = parent.pos[2] - dP / 2 - 0.05;
      const maxZP = parent.pos[2] + dP / 2 + 0.05;
      
      const itemX = item.pos[0];
      const itemZ = item.pos[2];
      
      if (itemX >= minXP && itemX <= maxXP && itemZ >= minZP && itemZ <= maxZP) {
        const topYP = parent.pos[1] + parent.size[1] / 2;
        if (topYP <= item.pos[1] + 0.1) {
          if (topYP > highestY) {
            highestY = topYP;
            bestParent = parent;
          }
        }
      }
    }
    
    if (bestParent) {
      item.parentId = bestParent.id;
      
      const parentPos = new THREE.Vector3(...bestParent.pos);
      let parentRotY = 0;
      if (Array.isArray(bestParent.rot)) parentRotY = bestParent.rot[1];
      else if (Array.isArray(bestParent.rotation)) parentRotY = bestParent.rotation[1];
      else if (typeof bestParent.rotation === "number") parentRotY = bestParent.rotation;
      
      const parentQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, parentRotY, 0));
      const invParentQuat = parentQuat.clone().invert();
      
      const itemWorldPos = new THREE.Vector3(...item.pos);
      const localPosVec = itemWorldPos.clone().sub(parentPos).applyQuaternion(invParentQuat);
      
      item.localPos = [localPosVec.x, localPosVec.y, localPosVec.z];
      
      let itemRotY = 0;
      if (Array.isArray(item.rot)) itemRotY = item.rot[1];
      else if (Array.isArray(item.rotation)) itemRotY = item.rotation[1];
      else if (typeof item.rotation === "number") itemRotY = item.rotation;
      
      item.localRot = [0, itemRotY - parentRotY, 0];
    }
  }
};

// Helper to resolve parent-child positions and rotations
const resolveParentChild = (items) => {
  return items.map(item => {
    if (item.parentId) {
      const parent = items.find(p => p.id === item.parentId);
      if (parent) {
        const parentPos = new THREE.Vector3(...parent.pos);
        
        let parentRotY = 0;
        if (Array.isArray(parent.rot)) parentRotY = parent.rot[1];
        else if (Array.isArray(parent.rotation)) parentRotY = parent.rotation[1];
        else if (typeof parent.rotation === "number") parentRotY = parent.rotation;
        
        const parentQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, parentRotY, 0));
        
        // Enforce the calculated Y offset for the top surface Y alignment
        const parentSurfaceLocalY = getSurfaceLocalY(parent.type, parent.size);
        const ch = item.size[1];
        const epsilon = 0.002;
        const correctLocalY = parentSurfaceLocalY + ch / 2 + epsilon;
        
        const localPosVec = new THREE.Vector3(item.localPos[0], correctLocalY, item.localPos[2]);
        const worldPosVec = parentPos.clone().add(localPosVec.clone().applyQuaternion(parentQuat));
        
        let localRotY = 0;
        if (item.localRot) {
          localRotY = Array.isArray(item.localRot) ? item.localRot[1] : (typeof item.localRot === "number" ? item.localRot : 0);
        }
        const finalRotY = parentRotY + localRotY;
        
        return {
          ...item,
          pos: [worldPosVec.x, worldPosVec.y, worldPosVec.z],
          rotation: [0, finalRotY, 0],
          localPos: [localPosVec.x, localPosVec.y, localPosVec.z]
        };
      }
    }
    return item;
  });
};

// Helper to snap decorative items to their underlying surfaces or floor
const snapPropsToSurfaces = (items) => {
  for (const itemA of items) {
    if (ANCHORED_TYPES.includes(itemA.type)) continue;
    if (itemA.parentId) continue; // Skip parented items

    const [wA, hA, dA] = itemA.size;
    const minXA = itemA.pos[0] - wA / 2;
    const maxXA = itemA.pos[0] + wA / 2;
    const minZA = itemA.pos[2] - dA / 2;
    const maxZA = itemA.pos[2] + dA / 2;

    let highestSurfaceY = 0; // floor

    for (const itemB of items) {
      if (itemA.id === itemB.id) continue;
      if (itemA.parentId === itemB.id) continue;

      // Don't snap to other non-anchored props to avoid stacking props on props
      if (!ANCHORED_TYPES.includes(itemB.type)) continue;

      const [wB, hB, dB] = itemB.size;
      const minXB = itemB.pos[0] - wB / 2;
      const maxXB = itemB.pos[0] + wB / 2;
      const minZB = itemB.pos[2] - dB / 2;
      const maxZB = itemB.pos[2] + dB / 2;

      // Check XZ overlap
      const overlapX = Math.min(maxXA, maxXB) - Math.max(minXA, minXB);
      const overlapZ = Math.min(maxZA, maxZB) - Math.max(minZA, minZB);

      if (overlapX > 0 && overlapZ > 0) {
        const topYB = itemB.pos[1] + hB / 2;
        // B must be below A's original bottom
        if (topYB <= itemA.pos[1] - hA / 2 + 0.1) {
          if (topYB > highestSurfaceY) {
            highestSurfaceY = topYB;
          }
        }
      }
    }

    // Snap bottom of A to highestSurfaceY
    itemA.pos[1] = highestSurfaceY + hA / 2;
  }
};

// Helper to push overlapping decorative items along their minimum penetration vector
const runFurnitureValidation = (items) => {
  const maxIterations = 10;
  let changed = true;
  let iterations = 0;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (let i = 0; i < items.length; i++) {
      const itemA = items[i];
      if (ANCHORED_TYPES.includes(itemA.type)) continue;

      const boxA = getAABB(itemA);

      for (let j = 0; j < items.length; j++) {
        if (i === j) continue;
        const itemB = items[j];
        if (itemA.parentId === itemB.id) continue; // Skip collision with its own parent

        const boxB = getAABB(itemB);
        const overlap = getOverlap(boxA, boxB);

        if (overlap) {
          const overlapPercent = overlap.volume / boxA.volume;
          if (overlapPercent > 0.05) {
            const minOverlap = Math.min(overlap.x, overlap.y, overlap.z);
            
            if (minOverlap === overlap.x) {
              const pushX = itemA.pos[0] >= itemB.pos[0] ? (overlap.x + 0.02) : -(overlap.x + 0.02);
              itemA.pos[0] += pushX;
            } else if (minOverlap === overlap.y) {
              const pushY = itemA.pos[1] >= itemB.pos[1] ? (overlap.y + 0.02) : -(overlap.y + 0.02);
              itemA.pos[1] += pushY;
            } else {
              const pushZ = itemA.pos[2] >= itemB.pos[2] ? (overlap.z + 0.02) : -(overlap.z + 0.02);
              itemA.pos[2] += pushZ;
            }
            changed = true;
            boxA.min.set(itemA.pos[0] - itemA.size[0]/2, itemA.pos[1] - itemA.size[1]/2, itemA.pos[2] - itemA.size[2]/2);
            boxA.max.set(itemA.pos[0] + itemA.size[0]/2, itemA.pos[1] + itemA.size[1]/2, itemA.pos[2] + itemA.size[2]/2);
          }
        }
      }
    }
  }
};

const validateAndCorrectDecorations = (items) => {
  for (const item of items) {
    if (item.parentId) {
      const parent = items.find(p => p.id === item.parentId);
      if (parent) {
        const parentSurfaceLocalY = getSurfaceLocalY(parent.type, parent.size);
        const ch = item.size[1];
        const epsilon = 0.002;
        const expectedLocalY = parentSurfaceLocalY + ch / 2 + epsilon;
        
        if (Math.abs(item.localPos[1] - expectedLocalY) > 0.02) {
          console.warn(`[Validation] Item ${item.id} Y was incorrect (${item.localPos[1]} vs expected ${expectedLocalY}). Correcting.`);
          item.localPos[1] = expectedLocalY;
          
          const parentPos = new THREE.Vector3(...parent.pos);
          let parentRotY = 0;
          if (Array.isArray(parent.rot)) parentRotY = parent.rot[1];
          else if (Array.isArray(parent.rotation)) parentRotY = parent.rotation[1];
          else if (typeof parent.rotation === "number") parentRotY = parent.rotation;
          
          const parentQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, parentRotY, 0));
          const localPosVec = new THREE.Vector3(...item.localPos);
          const worldPosVec = parentPos.clone().add(localPosVec.clone().applyQuaternion(parentQuat));
          item.pos = [worldPosVec.x, worldPosVec.y, worldPosVec.z];
        }
      }
    }
  }
};

const checkPlacementRules = (items) => {
  const tableTypes = ["table", "desk", "coffee_table", "side_table", "nightstand", "bed_bench", "counter", "kitchen_island", "wall_shelf"];
  const sofaTypes = ["sofa_main", "sofa_single", "sofa_l"];
  
  for (const item of items) {
    if (item.parentId) {
      const parent = items.find(p => p.id === item.parentId);
      if (parent) {
        if (item.type === "cushion") {
          if (!sofaTypes.includes(parent.type) && parent.type !== "bed") {
            console.error(`[Rule Violation] Cushion ${item.id} is parented to ${parent.type} (${parent.id}) which is forbidden!`);
          }
        }
        
        if (item.type === "desk_lamp") {
          if (!tableTypes.includes(parent.type)) {
            console.error(`[Rule Violation] Desk Lamp ${item.id} is parented to ${parent.type} (${parent.id}) which is forbidden!`);
          }
        }
        
        if (["mug", "book_stack", "microwave", "toaster", "blender", "coffee_maker", "fruit_bowl"].includes(item.type)) {
          if (!tableTypes.includes(parent.type)) {
            console.error(`[Rule Violation] Table Prop ${item.id} (${item.type}) is parented to ${parent.type} (${parent.id}) which is forbidden!`);
          }
        }
      }
    } else {
      if (["cushion", "desk_lamp", "mug", "book_stack"].includes(item.type)) {
        console.error(`[Rule Violation] Floor item ${item.id} has type ${item.type} which is forbidden on the Floor!`);
      }
      if (item.type === "lamp" && item.size[1] < 2.0) {
        console.error(`[Rule Violation] Lamp ${item.id} on floor is too small, behaves like a desk lamp which is forbidden on floor!`);
      }
      if (item.type === "plant" && item.size[1] < 1.2) {
        console.error(`[Rule Violation] Small plant ${item.id} on floor is forbidden!`);
      }
    }
  }
};

// 3. DECORATIONS: Non-colliding visual elements (rugs, windows, courtyard plants)
const DECORATIONS = [
  // Rugs
  { id: "dec_hall_rug", type: "rug", pos: [0, 0.015, 18.0], size: [12, 0.01, 10], color: "#e3d5ca" }, // Large central rug
  { id: "dec_hall_rug_left", type: "rug", pos: [-17, 0.015, 15.0], size: [7, 0.01, 7], color: "#d5bdaf" }, // Left recreation rug
  { id: "dec_hall_rug_right", type: "rug", pos: [16.5, 0.015, 15.0], size: [5.5, 0.01, 4.5], color: "#e3d5ca" }, // Right library rug
  { id: "dec_bedroom_rug", type: "rug", pos: [13, 0.015, -4.0], size: [10, 0.01, 8], color: "#52796f" }, // Bedroom rug
  { id: "dec_kitchen_rug", type: "rug", pos: [-15, 0.015, 1.5], size: [6, 0.01, 4.0], color: "#d5bdaf" },  // Kitchen table runner

  // Courtyard Grass & Landscaping
  { id: "dec_court_grass", type: "grass", pos: [0, 0.01, -5], size: [10, 0.01, 20], color: "#3f5e3d" },
  { id: "dec_court_tree_1", type: "tree", pos: [-2, 2.0, -8], size: [1.2, 4.0, 1.2], color: "#2d4a22" },
  { id: "dec_court_tree_2", type: "tree", pos: [2, 1.5, -2], size: [1.0, 3.0, 1.0], color: "#365c2b" },

  // Window Frames (Placed flat against walls/boundaries)
  { id: "dec_win_kitchen", type: "window_back", pos: [-15, 3.5, -14.4], size: [5.0, 3.0, 0.2] }, // Kitchen back wall
  { id: "dec_win_bedroom", type: "window_right", pos: [24.4, 3.5, -5], size: [0.2, 3.0, 6.0] }, // Bedroom right wall
  { id: "dec_win_hall", type: "window_hall", pos: [0, 3.2, 4.6], size: [8.0, 4.0, 0.2] },      // Hall center/courtyard wall

  // Sunbeams/Daylight volumes
  { id: "dec_beam_kitchen", type: "sunbeam", pos: [-15, 2.2, -10], rot: [0.5, 0.1, 0], size: [4.8, 0.05, 10] },
  { id: "dec_beam_bedroom", type: "sunbeam", pos: [20, 2.2, -5], rot: [0, 0, 0.5], size: [0.05, 2.8, 10] },
  { id: "dec_beam_hall", type: "sunbeam", pos: [0, 2.0, 10], rot: [0.6, 0, 0], size: [7.8, 0.05, 12] },

  // Wall Posters/Paintings (Bedroom and Hall)
  { id: "dec_bed_poster_1", type: "poster_back", pos: [15, 3.5, -14.4], size: [3.0, 2.0, 0.05], color: "#3b82f6" }, // Blue poster above bed
  { id: "dec_bed_poster_2", type: "poster_right", pos: [24.4, 3.5, 1], size: [0.05, 2.0, 3.0], color: "#e11d48" }, // Red poster next to door
  { id: "dec_hall_painting_1", type: "poster_front", pos: [-15, 3.5, 24.4], size: [4.0, 2.2, 0.05], color: "#1e3a8a" }, // Left painting in Hall
  { id: "dec_hall_painting_2", type: "poster_front", pos: [15, 3.5, 24.4], size: [4.0, 2.2, 0.05], color: "#1e3a8a" }, // Right painting in Hall
];

autoParentDecorations(FURNITURE_RAW);

let resolvedFurniture = resolveParentChild(FURNITURE_RAW);
snapPropsToSurfaces(resolvedFurniture);
runFurnitureValidation(resolvedFurniture);

// Recompute localPos after snap & push to make sure they are written back perfectly
resolvedFurniture = resolvedFurniture.map(item => {
  if (item.parentId) {
    const parent = resolvedFurniture.find(p => p.id === item.parentId);
    if (parent) {
      const parentPos = new THREE.Vector3(...parent.pos);
      let parentRotY = 0;
      if (Array.isArray(parent.rot)) parentRotY = parent.rot[1];
      else if (Array.isArray(parent.rotation)) parentRotY = parent.rotation[1];
      else if (typeof parent.rotation === "number") parentRotY = parent.rotation;
      
      const parentQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, parentRotY, 0));
      const invParentQuat = parentQuat.clone().invert();
      
      const itemWorldPos = new THREE.Vector3(...item.pos);
      const localPosVec = itemWorldPos.clone().sub(parentPos).applyQuaternion(invParentQuat);
      
      return {
        ...item,
        localPos: [localPosVec.x, localPosVec.y, localPosVec.z]
      };
    }
  }
  return item;
});

// Run validation and rule checks
validateAndCorrectDecorations(resolvedFurniture);
checkPlacementRules(resolvedFurniture);

const FURNITURE = resolvedFurniture;
const OBSTACLES = [...WALLS, ...FURNITURE];


console.log("TV Stand:", FURNITURE.find(f => f.id === "hall_tv_stand"));
console.log("TV Screen:", FURNITURE.find(f => f.id === "hall_tv_screen"));
console.log("Lamp 1:", FURNITURE.find(f => f.id === "hall_lamp_1"));
console.log("Lamp ns:", FURNITURE.find(f => f.id === "bedroom_lamp_ns"));
