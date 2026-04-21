use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

include!(concat!(env!("OUT_DIR"), "/generated_data.rs"));

#[derive(Serialize, Deserialize, Clone, PartialEq)]
pub enum Job {
    Chop(f32), 
    Mine(f32),
    Build(f32, f32), 
    Haul(f32, f32, f32), // item_id, target_x, target_y
    Eat(f32),
    Sleep,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PawnBio {
    pub name: String,
    pub gender: String,
    pub age: u32,
    pub traits: Vec<String>,
    pub incapable: Vec<String>,
    pub shooting: u8,
    pub melee: u8,
    pub construction: u8,
    pub mining: u8,
    pub cooking: u8,
    pub plants: u8,
    pub medicine: u8,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Pawn {
    pub id: f32,
    pub sprite_id: f32,
    pub x: f32,
    pub y: f32,
    pub target_x: Option<f32>,
    pub target_y: Option<f32>,
    pub current_job: Option<Job>,
    pub forced_job: bool,
    pub job_progress: f32, 
    pub hauling_item: Option<f32>,
    pub move_speed: f32,
    pub work_speed: f32,
    pub hp: f32,
    pub max_hp: f32,
    pub hunger: f32,
    pub max_hunger: f32,
    pub bio: PawnBio,
}

#[derive(Serialize, Deserialize, Clone, PartialEq)]
pub enum EntityType { Tree(u32), Rock, WoodResource, StoneChunk, Wall(u32), FoodResource }

#[derive(Serialize, Deserialize, Clone)]
pub struct StaticEntity {
    pub id: f32,
    pub e_type: EntityType,
    pub x: f32,
    pub y: f32,
    pub hp: f32,
    pub marked_for_job: bool, 
}

#[derive(Serialize, Deserialize, Clone)]
pub struct GameState {
    pub map_width: usize,
    pub map_height: usize,
    pub tiles: Vec<u8>, 
    pub zones: Vec<u8>, 
    pub pawns: Vec<Pawn>,
    pub interactables: Vec<StaticEntity>,
    pub globals_jobs: Vec<Job>, 
    pub next_entity_id: f32,
    pub global_time: f32,
}

#[wasm_bindgen]
pub struct Engine {
    state: GameState,
    render_buffer: Vec<f32>,
    time_scale: f32,
}

#[wasm_bindgen]
impl Engine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Engine {
        console_error_panic_hook::set_once();
        
        let width = 50;
        let height = 50;
        let mut tiles = vec![0; width * height];
        let mut interactables = Vec::new();
        let mut next_id = 1000.0;

        for y in 0..height {
            for x in 0..width {
                let rand_val = ((x * 13) ^ (y * 57) ^ 33) % 100;
                tiles[y * width + x] = if rand_val > 55 { 2 } else { 0 }; 
            }
        }

        for _ in 0..3 {
            let mut new_tiles = tiles.clone();
            for y in 0..height {
                for x in 0..width {
                    let mut stone_neighbors = 0;
                    for dy in -1..=1 {
                        for dx in -1..=1 {
                            let nx = x as i32 + dx;
                            let ny = y as i32 + dy;
                            if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                                if tiles[(ny as usize) * width + (nx as usize)] == 2 {
                                    stone_neighbors += 1;
                                }
                            }
                        }
                    }
                    new_tiles[y * width + x] = if stone_neighbors >= 5 { 2 } else { 0 };
                }
            }
            tiles = new_tiles;
        }

        for y in 0..height {
            for x in 0..width {
                let idx = y * width + x;
                let t = tiles[idx];
                let rand_val = ((x * 17) ^ (y * 81) ^ 12) % 100;

                if t == 0 && rand_val < 15 { tiles[idx] = 1; }

                if t == 0 && rand_val > 80 {
                    interactables.push(StaticEntity { id: next_id, e_type: EntityType::Tree(TREES[0].id), x: x as f32, y: y as f32, hp: TREES[0].hp, marked_for_job: false });
                    next_id += 1.0;
                }
                
                if t == 2 && rand_val > 70 { 
                    interactables.push(StaticEntity { id: next_id, e_type: EntityType::Rock, x: x as f32, y: y as f32, hp: 300.0, marked_for_job: false });
                    next_id += 1.0;
                }
                
                // Spawn Random Food
                if t == 0 && rand_val > 96 {
                    interactables.push(StaticEntity { id: next_id, e_type: EntityType::FoodResource, x: x as f32, y: y as f32, hp: 10.0, marked_for_job: false });
                    next_id += 1.0;
                }
            }
        }

        // Dynamically fetch from CSV arrays
        let pawn1_sd = ANIMALS.iter().find(|a| a.id == 101).map_or((1.0, 1.0), |a| (a.move_speed, a.work_speed));
        let pawn2_sd = ANIMALS.iter().find(|a| a.id == 102).map_or((1.0, 1.0), |a| (a.move_speed, a.work_speed));
        
        let gen_bio = |name: &str, gen: &str, age: u32| PawnBio {
            name: name.to_string(), gender: gen.to_string(), age,
            traits: vec!["Optimist".to_string(), "Hard Worker".to_string()],
            incapable: vec!["Art".to_string()],
            shooting: 4, melee: 6, construction: 8, mining: 5, cooking: 2, plants: 6, medicine: 3,
        };

        let pawns = vec![
            Pawn { id: 1.0, sprite_id: 101.0, x: 25.0, y: 25.0, target_x: None, target_y: None, current_job: None, forced_job: false, job_progress: 0.0, hauling_item: None, move_speed: pawn1_sd.0, work_speed: pawn1_sd.1, hp: 100.0, max_hp: 100.0, hunger: 80.0, max_hunger: 100.0, bio: gen_bio("Val", "Female", 28) },
            Pawn { id: 2.0, sprite_id: 102.0, x: 26.0, y: 25.0, target_x: None, target_y: None, current_job: None, forced_job: false, job_progress: 0.0, hauling_item: None, move_speed: pawn2_sd.0, work_speed: pawn2_sd.1, hp: 100.0, max_hp: 100.0, hunger: 50.0, max_hunger: 100.0, bio: gen_bio("Lumina", "Male", 35) },
            Pawn { id: 3.0, sprite_id: 101.0, x: 25.0, y: 26.0, target_x: None, target_y: None, current_job: None, forced_job: false, job_progress: 0.0, hauling_item: None, move_speed: pawn1_sd.0, work_speed: pawn1_sd.1, hp: 100.0, max_hp: 100.0, hunger: 60.0, max_hunger: 100.0, bio: gen_bio("Marcus", "Male", 41) },
        ];

        Engine {
            state: GameState {
                map_width: width, map_height: height,
                tiles, pawns, interactables,
                globals_jobs: Vec::new(),
                zones: vec![0; width * height],
                next_entity_id: next_id,
                global_time: 0.0,
            },
            render_buffer: Vec::with_capacity(10000),
            time_scale: 1.0,
        }
    }

    pub fn command_batch_chop(&mut self, start_x: f32, start_y: f32, end_x: f32, end_y: f32) {
        let min_x = start_x.min(end_x); let max_x = start_x.max(end_x);
        let min_y = start_y.min(end_y); let max_y = start_y.max(end_y);
        for ent in &mut self.state.interactables {
            if ent.x >= min_x && ent.x <= max_x && ent.y >= min_y && ent.y <= max_y {
                if matches!(ent.e_type, EntityType::Tree(_)) && !ent.marked_for_job {
                    ent.marked_for_job = true; self.state.globals_jobs.push(Job::Chop(ent.id));
                }
            }
        }
    }

    pub fn command_batch_mine(&mut self, start_x: f32, start_y: f32, end_x: f32, end_y: f32) {
        let min_x = start_x.min(end_x); let max_x = start_x.max(end_x);
        let min_y = start_y.min(end_y); let max_y = start_y.max(end_y);
        for ent in &mut self.state.interactables {
            if ent.x >= min_x && ent.x <= max_x && ent.y >= min_y && ent.y <= max_y {
                if matches!(ent.e_type, EntityType::Rock) && !ent.marked_for_job {
                    ent.marked_for_job = true; self.state.globals_jobs.push(Job::Mine(ent.id));
                }
            }
        }
    }

    pub fn command_build_wall(&mut self, x: f32, y: f32) {
        self.state.globals_jobs.push(Job::Build(x, y));
    }

    pub fn command_create_stockpile(&mut self, start_x: usize, start_y: usize, end_x: usize, end_y: usize) {
        let min_x = start_x.min(end_x); let max_x = start_x.max(end_x);
        let min_y = start_y.min(end_y); let max_y = start_y.max(end_y);
        for y in min_y..=max_y {
            for x in min_x..=max_x {
                if x < self.state.map_width && y < self.state.map_height {
                    self.state.zones[y * self.state.map_width + x] = 1;
                }
            }
        }
    }

    pub fn command_cancel_stockpile(&mut self, start_x: usize, start_y: usize, end_x: usize, end_y: usize) {
        let min_x = start_x.min(end_x); let max_x = start_x.max(end_x);
        let min_y = start_y.min(end_y); let max_y = start_y.max(end_y);
        for y in min_y..=max_y {
            for x in min_x..=max_x {
                if x < self.state.map_width && y < self.state.map_height {
                    self.state.zones[y * self.state.map_width + x] = 0;
                }
            }
        }
    }

    pub fn command_force_job(&mut self, pawn_id: f32, interactable_id: f32, force_type: u32) {
        // force_type: 1=Chop, 2=Mine, 3=Eat, 4=Haul
        if let Some(target) = self.state.interactables.iter_mut().find(|e| e.id == interactable_id) {
            target.marked_for_job = true;
            let job = match force_type {
                1 => Job::Chop(interactable_id),
                2 => Job::Mine(interactable_id),
                3 => Job::Eat(interactable_id),
                4 => Job::Haul(interactable_id, pawn_id, 0.0), // Placeholder destination
                _ => Job::Eat(interactable_id),
            };
            if let Some(pawn) = self.state.pawns.iter_mut().find(|p| p.id == pawn_id) {
                pawn.current_job = Some(job);
                pawn.forced_job = true;
                pawn.job_progress = 0.0;
            }
        }
    }

    pub fn tick(&mut self, _delta_time: f32) {
        if self.time_scale <= 0.0 { return; }
        let scaled_dt = _delta_time * self.time_scale;
        // 1 in-game hour = 3 real seconds (tripled day length)
        self.state.global_time += scaled_dt / 3.0;
        
        let mut interactables_to_destroy = Vec::new();
        let mut interactables_to_spawn = Vec::new();

        let current_hour = self.state.global_time % 24.0;
        let is_sleep_time = current_hour >= 22.0 || current_hour < 6.0;

        // 1. Automatic Job Assignments for Idle Pawns
        for pawn in &mut self.state.pawns {
            // Wake up if time to wake up
            if matches!(pawn.current_job, Some(Job::Sleep)) && !is_sleep_time && !pawn.forced_job {
                pawn.current_job = None;
            }

            // Hunger & Damage subsystem
            if matches!(pawn.current_job, Some(Job::Sleep)) {
                // Sleep reduces hunger 8x slower, and heals 2 HP per second
                pawn.hunger -= scaled_dt * (0.5 / 8.0);
                pawn.hp = (pawn.hp + scaled_dt * 2.0).min(pawn.max_hp);
            } else {
                pawn.hunger -= scaled_dt * 0.5;
            }
            if pawn.hunger <= 0.0 {
                pawn.hunger = 0.0;
                pawn.hp -= scaled_dt * 3.0;
            }
            
            // Hunger interrupt: if starving, drop non-forced jobs to go eat
            if pawn.hunger <= 35.0 && !pawn.forced_job {
                let mut closest_food = None;
                let mut closest_dist = 9999.0;
                for item in &self.state.interactables {
                    if matches!(item.e_type, EntityType::FoodResource) && !item.marked_for_job {
                        let dist = (item.x - pawn.x).powi(2) + (item.y - pawn.y).powi(2);
                        if dist < closest_dist {
                            closest_dist = dist;
                            closest_food = Some(item.id);
                        }
                    }
                }
                if let Some(fid) = closest_food {
                    // Only interrupt if not already eating
                    let already_eating = matches!(&pawn.current_job, Some(Job::Eat(_)));
                    if !already_eating {
                        if let Some(target) = self.state.interactables.iter_mut().find(|e| e.id == fid) {
                            target.marked_for_job = true;
                        }
                        pawn.hauling_item = None;
                        pawn.current_job = Some(Job::Eat(fid));
                        pawn.job_progress = 0.0;
                    }
                }
            }
            
            if pawn.current_job.is_none() {
                
                // Try to take a global architectural job
                if pawn.current_job.is_none() && !self.state.globals_jobs.is_empty() {
                    pawn.current_job = Some(self.state.globals_jobs.remove(0));
                    pawn.job_progress = 0.0;
                } else {
                    // Try to generate a Haul Job organically (Look for items scattered OUTSIDE zones)
                    // We only Haul if there are empty stockpile tiles!
                    let mut empty_zone_target: Option<(f32, f32)> = None;
                    for y in 0..self.state.map_height {
                        for x in 0..self.state.map_width {
                            if self.state.zones[y * self.state.map_width + x] == 1 {
                                // Is this zone tile empty? Only 1 item allowed per tile.
                                let tile_x = x as f32;
                                let tile_y = y as f32;
                                let is_occupied = self.state.interactables.iter().any(|item| {
                                    (item.x - tile_x).abs() < 0.5 && (item.y - tile_y).abs() < 0.5
                                });
                                if !is_occupied { empty_zone_target = Some((tile_x, tile_y)); break; }
                            }
                        }
                        if empty_zone_target.is_some() { break; }
                    }

                    if let Some((zx, zy)) = empty_zone_target {
                        // Find a loose resource
                        for item in &mut self.state.interactables {
                            if (matches!(item.e_type, EntityType::WoodResource) || matches!(item.e_type, EntityType::StoneChunk)) && !item.marked_for_job {
                                let izx = item.x.round() as usize; let izy = item.y.round() as usize;
                                let is_in_zone = if izy < self.state.map_height && izx < self.state.map_width { self.state.zones[izy * self.state.map_width + izx] == 1 } else { false };
                                
                                if !is_in_zone {
                                    item.marked_for_job = true;
                                    pawn.current_job = Some(Job::Haul(item.id, zx, zy));
                                    pawn.forced_job = false;
                                    pawn.job_progress = 0.0;
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // Sleep Mechanic Auto-Assignment
            if pawn.current_job.is_none() && is_sleep_time && !pawn.forced_job {
                pawn.current_job = Some(Job::Sleep);
            }

            // 2. Job Execution
            if let Some(job) = &pawn.current_job {
                match job {
                    Job::Chop(target_id) | Job::Mine(target_id) | Job::Eat(target_id) => {
                        let target = self.state.interactables.iter().find(|e| e.id == *target_id);
                        if let Some(t) = target {
                            pawn.target_x = Some(t.x); pawn.target_y = Some(t.y);
                        } else {
                            pawn.current_job = None; 
                        }
                    },
                    Job::Build(tx, ty) => {
                        pawn.target_x = Some(*tx); pawn.target_y = Some(*ty);
                    },
                    Job::Haul(target_id, zx, zy) => {
                        // If we haven't picked it up, go to it.
                        if pawn.hauling_item.is_none() {
                            let target = self.state.interactables.iter().find(|e| e.id == *target_id);
                            if let Some(t) = target {
                                pawn.target_x = Some(t.x); pawn.target_y = Some(t.y);
                            } else {
                                pawn.current_job = None; 
                            }
                        } else {
                            // Already holding the item, walk to zone dest
                            pawn.target_x = Some(*zx); pawn.target_y = Some(*zy);
                        }
                    },
                    Job::Sleep => {
                        // Do not move while sleeping
                        pawn.target_x = None; pawn.target_y = None;
                    }
                }
            }

            // 3. Navigation & Actions Phase
            if let (Some(tx), Some(ty)) = (pawn.target_x, pawn.target_y) {
                let dx = tx - pawn.x; let dy = ty - pawn.y;
                let dist = (dx*dx + dy*dy).sqrt();
                
                if dist < 1.0 { 
                    // Reached intermediate or final destination
                    if let Some(job) = pawn.current_job.clone() {
                        match job {
                            Job::Chop(tid) | Job::Mine(tid) => {
                                pawn.target_x = None; pawn.target_y = None;
                                pawn.job_progress += scaled_dt * pawn.work_speed * 20.0; 
                                if pawn.job_progress > 10.0 { 
                                    pawn.current_job = None;
                                    interactables_to_destroy.push(tid);
                                    if matches!(job, Job::Chop(_)) {
                                        interactables_to_spawn.push((EntityType::WoodResource, pawn.x, pawn.y));
                                    } else {
                                        interactables_to_spawn.push((EntityType::StoneChunk, pawn.x, pawn.y));
                                    }
                                }
                            },
                            Job::Eat(fid) => {
                                pawn.target_x = None; pawn.target_y = None;
                                pawn.job_progress += scaled_dt * pawn.work_speed * 10.0;
                                if pawn.job_progress > 10.0 {
                                    pawn.current_job = None;
                                    pawn.hunger = (pawn.hunger + 50.0).min(pawn.max_hunger);
                                    interactables_to_destroy.push(fid);
                                }
                            },
                            Job::Sleep => {},
                            Job::Build(bx, by) => {
                                pawn.target_x = None; pawn.target_y = None;
                                pawn.job_progress += scaled_dt * pawn.work_speed * 10.0; 
                                if pawn.job_progress > 10.0 {
                                    pawn.current_job = None;
                                    interactables_to_spawn.push((EntityType::Wall(BUILDINGS[0].id), bx, by));
                                }
                            },
                            Job::Haul(item_id, _, _) => {
                                // Arrive at Item -> Pick up
                                if pawn.hauling_item.is_none() {
                                    pawn.hauling_item = Some(item_id);
                                    // Let the next loop tick route us to the destination
                                } else {
                                    // Arrived at DB Stockpile Zone Dropoff
                                    pawn.current_job = None;
                                    pawn.hauling_item = None;
                                    pawn.target_x = None; pawn.target_y = None;
                                    
                                    // Remove 'marked_for_job' from the item now that it's successfully placed!
                                    if let Some(mut target) = self.state.interactables.iter_mut().find(|e| e.id == item_id) {
                                        target.marked_for_job = false;
                                        // Item gets snapped precisely perfectly onto the tile grid by the hauler!
                                        target.x = pawn.x.round();
                                        target.y = pawn.y.round();
                                    }
                                }
                            }
                        }
                    }
                } else {
                    let speed = pawn.move_speed * 2.0;
                    pawn.x += (dx / dist) * speed * scaled_dt; pawn.y += (dy / dist) * speed * scaled_dt;
                    
                    // If carrying an item, physically drag its X/Y coordinates inline with us!
                    if let Some(heid) = pawn.hauling_item {
                        if let Some(held_item) = self.state.interactables.iter_mut().find(|e| e.id == heid) {
                            held_item.x = pawn.x; held_item.y = pawn.y; 
                        } else {
                            // Ghost item exception handler
                            pawn.hauling_item = None;
                            pawn.current_job = None;
                        }
                    }
                }
            } else if pawn.current_job.is_none() { 
                pawn.target_x = Some((pawn.x + 3.0) % 50.0);
                pawn.target_y = Some((pawn.y + 2.0) % 50.0);
            }
        }
        
        // Remove dead pawns
        self.state.pawns.retain(|p| p.hp > 0.0);

        // Apply Destructions & Spawns
        for id in interactables_to_destroy {
            self.state.interactables.retain(|e| e.id != id);
        }
        for (spawn_type, sx, sy) in interactables_to_spawn {
            // Uniquely jitter dropped items slightly for organic visual feel!
            self.state.interactables.push(StaticEntity {
                id: self.state.next_entity_id, e_type: spawn_type,
                x: sx + 0.3, y: sy + 0.2, hp: 100.0, marked_for_job: false
            });
            self.state.next_entity_id += 1.0;
        }
    }
    
    pub fn get_render_buffer(&mut self) -> js_sys::Float32Array {
        self.render_buffer.clear();
        self.render_buffer.push(self.state.global_time as f32);
        self.render_buffer.push(self.state.map_width as f32);
        self.render_buffer.push(self.state.map_height as f32);
        
        for t in &self.state.tiles { self.render_buffer.push(*t as f32); }
        for z in &self.state.zones { self.render_buffer.push(*z as f32); }
        
        self.render_buffer.push(self.state.pawns.len() as f32);
        for pawn in &self.state.pawns {
            self.render_buffer.push(pawn.id);
            let display_sprite_id = if matches!(pawn.current_job, Some(Job::Sleep)) { pawn.sprite_id + 1000.0 } else { pawn.sprite_id };
            self.render_buffer.push(display_sprite_id);
            self.render_buffer.push(pawn.x); self.render_buffer.push(pawn.y);
        }
        self.render_buffer.push(self.state.interactables.len() as f32);
        for ent in &self.state.interactables {
            self.render_buffer.push(ent.id);
            let custom_type: f32 = match ent.e_type {
                EntityType::Tree(_) => if ent.marked_for_job { 205.0 } else { 201.0 }, 
                EntityType::Rock => if ent.marked_for_job { 206.0 } else { 202.0 },
                EntityType::WoodResource => 301.0,
                EntityType::StoneChunk => 302.0,
                EntityType::FoodResource => 303.0,
                EntityType::Wall(_) => 401.0,
            };
            self.render_buffer.push(custom_type);
            self.render_buffer.push(ent.x); self.render_buffer.push(ent.y);
        }
        js_sys::Float32Array::from(self.render_buffer.as_slice())
    }

    pub fn set_time_scale(&mut self, scale: f32) {
        self.time_scale = scale;
    }

    pub fn get_basic_pawn_list(&self) -> String {
        let mut list = Vec::new();
        for p in &self.state.pawns {
            list.push(format!(r#"{{"id":{}, "name":"{}"}}"#, p.id, p.bio.name));
        }
        format!("[{}]", list.join(","))
    }

    pub fn get_pawn_target_path(&self, id: f32) -> String {
        if let Some(pawn) = self.state.pawns.iter().find(|p| p.id == id) {
            if let (Some(tx), Some(ty)) = (pawn.target_x, pawn.target_y) {
                return format!(r#"{{"x":{},"y":{}}}"#, tx, ty);
            }
        }
        "null".to_string()
    }

    pub fn get_pawn_info(&self, id: f32) -> String {
        if let Some(pawn) = self.state.pawns.iter().find(|p| p.id == id) {
            let job_str = match &pawn.current_job {
                Some(Job::Chop(_)) => "Chopping Tree",
                Some(Job::Mine(_)) => "Mining Rock",
                Some(Job::Build(_, _)) => "Building Structure",
                Some(Job::Haul(_, _, _)) => "Hauling Cargo",
                Some(Job::Eat(_)) => "Eating Resource",
                Some(Job::Sleep) => "Sleeping",
                None => "Idle",
            };
            let forced = if pawn.forced_job && pawn.current_job.is_some() { " (Forced)" } else { "" };
            let bio_json = serde_json::to_string(&pawn.bio).unwrap_or_else(|_| "{}".to_string());
            
            format!(r#"{{"id":{}, "hp":{}, "max_hp":{}, "hunger":{}, "max_hunger":{}, "job":"{}{}", "bio": {}}}"#,
                pawn.id, pawn.hp, pawn.max_hp, pawn.hunger, pawn.max_hunger, job_str, forced, bio_json)
        } else {
            "{}".to_string()
        }
    }

    pub fn save_to_json(&self) -> String { serde_json::to_string(&self.state).unwrap_or_else(|_| "{}".to_string()) }
    pub fn load_from_json(&mut self, json_data: &str) -> bool {
        if let Ok(new_state) = serde_json::from_str(json_data) { self.state = new_state; true } else { false }
    }
}
