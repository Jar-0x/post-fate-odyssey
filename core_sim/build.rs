use std::env;
use std::fs;
use std::path::Path;

fn main() {
    let out_dir = env::var_os("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("generated_data.rs");

    #[derive(Debug, Clone)]
    pub struct BuildingData { pub id: u32, pub hp: f32, pub material_id: u32, pub cost: u32, pub build_time: f32 }

    #[derive(Debug, Clone)]
    pub struct PawnCsvData { pub id: u32, pub move_speed: f32, pub work_speed: f32 }
    
    let mut code = String::new();
    
    // Struct Definitions
    code.push_str("#[derive(Debug, Clone)]\n");
    code.push_str("pub struct TreeData { pub id: u32, pub hp: f32, pub wood_yield: u32, pub chop_time: f32 }\n");
    
    code.push_str("#[derive(Debug, Clone)]\n");
    code.push_str("pub struct BuildingData { pub id: u32, pub hp: f32, pub material_id: u32, pub cost: u32, pub build_time: f32 }\n\n");

    code.push_str("#[derive(Debug, Clone)]\n");
    code.push_str("pub struct PawnCsvData { pub id: u32, pub move_speed: f32, pub work_speed: f32 }\n\n");


    // Process Plants
    let trees_csv = fs::read_to_string("../data/plants/wild_trees.csv").unwrap_or_default();
    code.push_str("pub const TREES: &[TreeData] = &[\n");
    for line in trees_csv.lines().skip(1) {
        if line.trim().is_empty() { continue; }
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() >= 5 {
            code.push_str(&format!("  TreeData {{ id: {}, hp: {}.0, wood_yield: {}, chop_time: {}.0 }},\n",
                parts[0], parts[2], parts[3], parts[4]));
        }
    }
    code.push_str("];\n");

    // Process Structures
    let buildings_csv = fs::read_to_string("../data/structures/buildings.csv").unwrap_or_default();
    code.push_str("pub const BUILDINGS: &[BuildingData] = &[\n");
    for line in buildings_csv.lines().skip(1) {
        if line.trim().is_empty() { continue; }
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() >= 6 {
            code.push_str(&format!("  BuildingData {{ id: {}, hp: {}.0, material_id: {}, cost: {}, build_time: {}.0 }},\n",
                parts[0], parts[2], parts[3], parts[4], parts[5]));
        }
    }
    code.push_str("];\n");

    // Process Pawns
    let parse_pawn_csv = |path: &str, array_name: &str, out: &mut String| {
        let csv = fs::read_to_string(path).unwrap_or_default();
        out.push_str(&format!("pub const {}: &[PawnCsvData] = &[\n", array_name));
        for line in csv.lines().skip(1) {
            if line.trim().is_empty() { continue; }
            let parts: Vec<&str> = line.split(',').collect();
            if parts.len() >= 4 {
                let ms: f32 = parts[2].parse().unwrap_or(1.0);
                let ws: f32 = parts[3].parse().unwrap_or(1.0);
                out.push_str(&format!("  PawnCsvData {{ id: {}, move_speed: {:?}, work_speed: {:?} }},\n",
                    parts[0], ms, ws));
            }
        }
        out.push_str("];\n");
    };

    parse_pawn_csv("../data/pawns/traits.csv", "TRAITS", &mut code);
    parse_pawn_csv("../data/pawns/animals.csv", "ANIMALS", &mut code);

    code.push_str("pub const DATA_LOADED: bool = true;\n");

    fs::write(&dest_path, code).unwrap();
    
    println!("cargo:rerun-if-changed=../data/");
}
