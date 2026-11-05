export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      objects: {
        Row: {
          address: string
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          address: string
          created_at?: string
          created_by?: string
          id?: string
          name: string
        }
        Update: {
          address?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'objects_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          full_name: string
          id: string
          role: Database['public']['Enums']['app_role']
        }
        Insert: {
          full_name: string
          id: string
          role: Database['public']['Enums']['app_role']
        }
        Update: {
          full_name?: string
          id?: string
          role?: Database['public']['Enums']['app_role']
        }
        Relationships: []
      }
      task_history: {
        Row: {
          actor_id: string
          comment: string | null
          created_at: string
          from_status: Database['public']['Enums']['task_status'] | null
          id: number
          task_id: string
          to_status: Database['public']['Enums']['task_status']
        }
        Insert: {
          actor_id: string
          comment?: string | null
          created_at?: string
          from_status?: Database['public']['Enums']['task_status'] | null
          id?: never
          task_id: string
          to_status: Database['public']['Enums']['task_status']
        }
        Update: {
          actor_id?: string
          comment?: string | null
          created_at?: string
          from_status?: Database['public']['Enums']['task_status'] | null
          id?: never
          task_id?: string
          to_status?: Database['public']['Enums']['task_status']
        }
        Relationships: [
          {
            foreignKeyName: 'task_history_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_history_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string
          author_id: string
          created_at: string
          description: string
          id: string
          object_id: string
          status: Database['public']['Enums']['task_status']
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id: string
          author_id?: string
          created_at?: string
          description?: string
          id?: string
          object_id: string
          status?: Database['public']['Enums']['task_status']
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string
          author_id?: string
          created_at?: string
          description?: string
          id?: string
          object_id?: string
          status?: Database['public']['Enums']['task_status']
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_object_id_fkey'
            columns: ['object_id']
            isOneToOne: false
            referencedRelation: 'objects'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      change_task_status: {
        Args: {
          p_comment?: string
          p_task_id: string
          p_to: Database['public']['Enums']['task_status']
        }
        Returns: {
          assignee_id: string
          author_id: string
          created_at: string
          description: string
          id: string
          object_id: string
          status: Database['public']['Enums']['task_status']
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'tasks'
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: 'manager' | 'executor'
      task_status: 'new' | 'in_progress' | 'review' | 'accepted' | 'rework'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]
