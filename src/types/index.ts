export interface Subject {
  id: string;
  user_id?: string;
  name: string;
  code?: string;
  color: string;
  units?: Unit[];
}

export interface Unit {
  id: string;
  subject_id: string;
  unit_number: number;
  title: string;
  keywords?: string[];
}

export interface Note {
  id: string;
  user_id?: string;
  subject_id: string;
  unit_id?: string;
  original_filename: string;
  clean_title: string;
  storage_path: string;
  file_url: string;
  file_size: number;
  summary?: string;
  confidence?: number;
  created_at: string;
  subject?: Subject;
  unit?: Unit;
}

export interface AIClassificationResult {
  subjectName: string;
  unitNumber: number;
  cleanTitle: string;
  summary: string;
  confidence: number;
  keyTopics: string[];
}
