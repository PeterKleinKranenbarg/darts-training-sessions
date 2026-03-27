import json
import os

def process_50_out(exercise):
    """Process 50-out training type and add required statistics."""
    darts_per_round = exercise.get('darts_per_round', [])
    
    # Number of rounds
    exercise['number_of_rounds'] = len(darts_per_round)
    
    # Number of rounds out in one go (3 or less darts)
    exercise['rounds_out_one_go'] = sum(1 for darts in darts_per_round if 0 < darts <= 3)
    
    # Number of rounds out in two gos (6 or less darts)
    exercise['rounds_out_two_gos'] = sum(1 for darts in darts_per_round if 0 < darts <= 6)
    
    # Number of rounds in three gos (9 or less darts)
    exercise['rounds_out_three_gos'] = sum(1 for darts in darts_per_round if 0 < darts <= 9)
    
    # Number of no out (0 means not out)
    exercise['number_of_no_out'] = sum(1 for darts in darts_per_round if darts == 0)

def process_round_the_board(exercise):
    """Process round the board training type."""
    # Only calculate darts_up_to_bullseye if it's missing (simply count darts array length)
    if 'darts_up_to_bullseye' not in exercise:
        darts = exercise.get('darts', [])
        exercise['darts_up_to_bullseye'] = len(darts)
    
    # darts_on_bullseye should be preserved if present, only set default if missing
    if 'darts_on_bullseye' not in exercise:
        exercise['darts_on_bullseye'] = 0

def process_treble(exercise):
    """Process treble training type and add required statistics."""
    target_treble = exercise.get('treble', '').upper()  # Normalize to uppercase
    darts = exercise.get('darts', [])
    
    # Initialize counters
    target_treble_hits = 0
    single_double_hits = 0
    misses = 0
    
    # Extract the number from the treble (e.g., T20 -> 20)
    if target_treble.startswith('T') and len(target_treble) > 1:
        try:
            target_number = int(target_treble[1:])
        except ValueError:
            target_number = None
    else:
        target_number = None
    
    for dart in darts:
        # Convert to string for comparison if it's not already
        dart_str = str(dart).upper()
        
        # Check for target treble hit
        if dart_str == target_treble:
            target_treble_hits += 1
        # Check for single or double version of the target
        elif target_number is not None:
            single_version = str(target_number)
            double_version = f"D{target_number}"
            
            if dart_str == single_version or dart_str == double_version:
                single_double_hits += 1
            else:
                misses += 1
        else:
            # If we can't parse the target treble, treat as miss
            misses += 1
    
    # Add the statistics (keep as numbers)
    exercise['target_treble_hits'] = target_treble_hits
    exercise['single_double_version_hits'] = single_double_hits
    exercise['misses'] = misses

def clean_exercise(exercise):
    """Clean up the exercise data: convert numbers in darts arrays to strings and capitalize d/t values."""
    # Process all fields in the exercise
    for key, value in list(exercise.items()):
        if key == 'darts' and isinstance(value, list):
            # Process each item in darts array: convert numbers to strings and capitalize d/t
            cleaned_darts = []
            for item in value:
                if isinstance(item, int):
                    # Convert numbers to strings
                    cleaned_darts.append(str(item))
                elif isinstance(item, str):
                    # Capitalize d and t values
                    if item.lower().startswith('d') and len(item) > 1:
                        cleaned_darts.append('D' + item[1:].upper())
                    elif item.lower().startswith('t') and len(item) > 1:
                        cleaned_darts.append('T' + item[1:].upper())
                    else:
                        cleaned_darts.append(item)
                else:
                    cleaned_darts.append(str(item))
            exercise[key] = cleaned_darts
        # Note: darts_per_round is left as numbers (not converted to strings)

def process_data(input_path, output_path):
    """Main function to process the training data."""
    # Load the input data
    with open(input_path, 'r') as f:
        data = json.load(f)
    
    # Process each training exercise
    for exercise in data.get('training_exercises', []):
        training_type = exercise.get('training_type', '').lower()
        
        if training_type == '50-out':
            process_50_out(exercise)
        elif training_type == 'round_the_board':
            process_round_the_board(exercise)
        elif training_type == 'treble':
            process_treble(exercise)
        
        # Clean up the data
        clean_exercise(exercise)
    
    # Save the enriched data
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Data processed and saved to {output_path}")

if __name__ == "__main__":
    input_file = os.path.join("training-sessions", "26_03_2026.json")
    output_file = "complete_data.json"
    
    process_data(input_file, output_file)