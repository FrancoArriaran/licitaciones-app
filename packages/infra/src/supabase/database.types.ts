
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "alert_matches": {
                  Row: {
                    "id": number,"matched_at": string,"notified_at": string | null,"ocid": string,"organization_id": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"matched_at"?: string,"notified_at"?: string | null,"ocid": string,"organization_id": string,"profile_id": string
                  }
                  Update: {
                    "id"?: never,"matched_at"?: string,"notified_at"?: string | null,"ocid"?: string,"organization_id"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alert_matches_ocid_fkey"
      columns: ["ocid"]
isOneToOne: false
      referencedRelation: "pending_alert_notifications"
      referencedColumns: ["ocid"]
    },{
      foreignKeyName: "alert_matches_ocid_fkey"
      columns: ["ocid"]
isOneToOne: false
      referencedRelation: "tenders"
      referencedColumns: ["ocid"]
    },{
      foreignKeyName: "alert_matches_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alert_matches_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "alert_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"alert_profiles": {
                  Row: {
                    "business_description": string,"created_at": string,"created_by": string | null,"departments": (string)[],"id": string,"max_amount": number | null,"min_amount": number | null,"name": string,"organization_id": string,"status": string,"unspsc_families": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_description": string,"created_at"?: string,"created_by"?: string | null,"departments"?: (string)[],"id"?: string,"max_amount"?: number | null,"min_amount"?: number | null,"name": string,"organization_id": string,"status"?: string,"unspsc_families": (string)[],"updated_at"?: string
                  }
                  Update: {
                    "business_description"?: string,"created_at"?: string,"created_by"?: string | null,"departments"?: (string)[],"id"?: string,"max_amount"?: number | null,"min_amount"?: number | null,"name"?: string,"organization_id"?: string,"status"?: string,"unspsc_families"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alert_profiles_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"award_items": {
                  Row: {
                    "amount": number | null,"award_id": string,"cubso_code": string | null,"description": string | null,"item_id": string,"ocid": string,"quantity": number | null,"unit_name": string | null,"unspsc_code": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number | null,"award_id": string,"cubso_code"?: string | null,"description"?: string | null,"item_id": string,"ocid": string,"quantity"?: number | null,"unit_name"?: string | null,"unspsc_code"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number | null,"award_id"?: string,"cubso_code"?: string | null,"description"?: string | null,"item_id"?: string,"ocid"?: string,"quantity"?: number | null,"unit_name"?: string | null,"unspsc_code"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "award_items_award_id_fkey"
      columns: ["award_id"]
isOneToOne: false
      referencedRelation: "awards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "award_items_ocid_fkey"
      columns: ["ocid"]
isOneToOne: false
      referencedRelation: "pending_alert_notifications"
      referencedColumns: ["ocid"]
    },{
      foreignKeyName: "award_items_ocid_fkey"
      columns: ["ocid"]
isOneToOne: false
      referencedRelation: "tenders"
      referencedColumns: ["ocid"]
    }
                  ]
                },"awards": {
                  Row: {
                    "amount": number | null,"award_date": string | null,"currency": string | null,"id": string,"ocid": string,"supplier_id": string | null,"supplier_name": string | null,"supplier_ruc": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number | null,"award_date"?: string | null,"currency"?: string | null,"id": string,"ocid": string,"supplier_id"?: string | null,"supplier_name"?: string | null,"supplier_ruc"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number | null,"award_date"?: string | null,"currency"?: string | null,"id"?: string,"ocid"?: string,"supplier_id"?: string | null,"supplier_name"?: string | null,"supplier_ruc"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "awards_ocid_fkey"
      columns: ["ocid"]
isOneToOne: false
      referencedRelation: "pending_alert_notifications"
      referencedColumns: ["ocid"]
    },{
      foreignKeyName: "awards_ocid_fkey"
      columns: ["ocid"]
isOneToOne: false
      referencedRelation: "tenders"
      referencedColumns: ["ocid"]
    }
                  ]
                },"bid_documents": {
                  Row: {
                    "bid_id": string,"content_type": string | null,"created_at": string,"id": string,"name": string,"organization_id": string,"size_bytes": number,"storage_path": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bid_id": string,"content_type"?: string | null,"created_at"?: string,"id"?: string,"name": string,"organization_id": string,"size_bytes": number,"storage_path": string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "bid_id"?: string,"content_type"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"organization_id"?: string,"size_bytes"?: number,"storage_path"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "bid_documents_bid_id_fkey"
      columns: ["bid_id"]
isOneToOne: false
      referencedRelation: "bids"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bid_documents_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"bid_events": {
                  Row: {
                    "actor_id": string | null,"bid_id": string,"created_at": string,"data": NonNullable<Json>,"id": number,"organization_id": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"bid_id": string,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: never,"organization_id": string,"type": string
                  }
                  Update: {
                    "actor_id"?: string | null,"bid_id"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: never,"organization_id"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bid_events_bid_id_fkey"
      columns: ["bid_id"]
isOneToOne: false
      referencedRelation: "bids"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bid_events_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"bids": {
                  Row: {
                    "assignee_id": string | null,"awarded_amount": number | null,"created_at": string,"created_by": string | null,"id": string,"lost_reason": string | null,"ocid": string,"offered_amount": number | null,"organization_id": string,"source": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"awarded_amount"?: number | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"lost_reason"?: string | null,"ocid": string,"offered_amount"?: number | null,"organization_id": string,"source"?: string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "assignee_id"?: string | null,"awarded_amount"?: number | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"lost_reason"?: string | null,"ocid"?: string,"offered_amount"?: number | null,"organization_id"?: string,"source"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bids_ocid_fkey"
      columns: ["ocid"]
isOneToOne: false
      referencedRelation: "pending_alert_notifications"
      referencedColumns: ["ocid"]
    },{
      foreignKeyName: "bids_ocid_fkey"
      columns: ["ocid"]
isOneToOne: false
      referencedRelation: "tenders"
      referencedColumns: ["ocid"]
    },{
      foreignKeyName: "bids_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "date_published": string | null,"document_type": string | null,"format": string | null,"id": string,"ocid": string,"title": string | null,"updated_at": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "date_published"?: string | null,"document_type"?: string | null,"format"?: string | null,"id": string,"ocid": string,"title"?: string | null,"updated_at"?: string,"url"?: string | null
                  }
                  Update: {
                    "date_published"?: string | null,"document_type"?: string | null,"format"?: string | null,"id"?: string,"ocid"?: string,"title"?: string | null,"updated_at"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_ocid_fkey"
      columns: ["ocid"]
isOneToOne: false
      referencedRelation: "pending_alert_notifications"
      referencedColumns: ["ocid"]
    },{
      foreignKeyName: "documents_ocid_fkey"
      columns: ["ocid"]
isOneToOne: false
      referencedRelation: "tenders"
      referencedColumns: ["ocid"]
    }
                  ]
                },"leads": {
                  Row: {
                    "company_name": string,"created_at": string,"email": string,"full_name": string,"id": string,"job_title": string | null,"phone": string,"ruc": string | null,"sector": string,"sells_to_government": string,"source": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_name": string,"created_at"?: string,"email": string,"full_name": string,"id"?: string,"job_title"?: string | null,"phone": string,"ruc"?: string | null,"sector": string,"sells_to_government": string,"source": string,"status"?: string
                  }
                  Update: {
                    "company_name"?: string,"created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"job_title"?: string | null,"phone"?: string,"ruc"?: string | null,"sector"?: string,"sells_to_government"?: string,"source"?: string,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"memberships": {
                  Row: {
                    "email": string,"invited_at": string,"invited_by": string | null,"joined_at": string | null,"organization_id": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "email": string,"invited_at"?: string,"invited_by"?: string | null,"joined_at"?: string | null,"organization_id": string,"role": string,"user_id": string
                  }
                  Update: {
                    "email"?: string,"invited_at"?: string,"invited_by"?: string | null,"joined_at"?: string | null,"organization_id"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"mype_profiles": {
                  Row: {
                    "business_description": string,"company_name": string,"created_at": string,"departments": (string)[],"id": number,"mapping_reasoning": string | null,"max_amount": number | null,"min_amount": number | null,"ruc": string | null,"status": string,"unspsc_families": (string)[],"whatsapp_phone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_description": string,"company_name": string,"created_at"?: string,"departments"?: (string)[],"id"?: number,"mapping_reasoning"?: string | null,"max_amount"?: number | null,"min_amount"?: number | null,"ruc"?: string | null,"status"?: string,"unspsc_families"?: (string)[],"whatsapp_phone": string
                  }
                  Update: {
                    "business_description"?: string,"company_name"?: string,"created_at"?: string,"departments"?: (string)[],"id"?: number,"mapping_reasoning"?: string | null,"max_amount"?: number | null,"min_amount"?: number | null,"ruc"?: string | null,"status"?: string,"unspsc_families"?: (string)[],"whatsapp_phone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notification_settings": {
                  Row: {
                    "digest_hour": number,"email_enabled": boolean,"organization_id": string,"updated_at": string,"whatsapp_enabled": boolean,"whatsapp_opt_in_at": string | null,"whatsapp_phone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "digest_hour"?: number,"email_enabled"?: boolean,"organization_id": string,"updated_at"?: string,"whatsapp_enabled"?: boolean,"whatsapp_opt_in_at"?: string | null,"whatsapp_phone"?: string | null
                  }
                  Update: {
                    "digest_hour"?: number,"email_enabled"?: boolean,"organization_id"?: string,"updated_at"?: string,"whatsapp_enabled"?: boolean,"whatsapp_opt_in_at"?: string | null,"whatsapp_phone"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_settings_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: true
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"name": string,"ruc": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"ruc": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"ruc"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"plans": {
                  Row: {
                    "code": string,"created_at": string,"default_max_seats": number,"features": NonNullable<Json>,"max_alert_profiles": number | null,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"default_max_seats": number,"features"?: NonNullable<Json>,"max_alert_profiles"?: number | null,"name": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"default_max_seats"?: number,"features"?: NonNullable<Json>,"max_alert_profiles"?: number | null,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"platform_admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"subscriptions": {
                  Row: {
                    "created_at": string,"ends_at": string,"max_seats": number,"organization_id": string,"plan_code": string,"starts_at": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_at": string,"max_seats": number,"organization_id": string,"plan_code": string,"starts_at": string,"status": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string,"max_seats"?: number,"organization_id"?: string,"plan_code"?: string,"starts_at"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: true
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_plan_code_fkey"
      columns: ["plan_code"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["code"]
    }
                  ]
                },"sync_runs": {
                  Row: {
                    "awards_upserted": number,"documents_upserted": number,"error_message": string | null,"id": number,"month": number,"ran_at": string,"status": string,"tenders_upserted": number,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "awards_upserted"?: number,"documents_upserted": number,"error_message"?: string | null,"id"?: number,"month": number,"ran_at"?: string,"status": string,"tenders_upserted": number,"year": number
                  }
                  Update: {
                    "awards_upserted"?: number,"documents_upserted"?: number,"error_message"?: string | null,"id"?: number,"month"?: number,"ran_at"?: string,"status"?: string,"tenders_upserted"?: number,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"tender_items": {
                  Row: {
                    "amount": number | null,"cubso_code": string | null,"description": string | null,"item_id": string,"ocid": string,"position": number | null,"quantity": number | null,"status_details": string | null,"unit_name": string | null,"unspsc_code": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number | null,"cubso_code"?: string | null,"description"?: string | null,"item_id": string,"ocid": string,"position"?: number | null,"quantity"?: number | null,"status_details"?: string | null,"unit_name"?: string | null,"unspsc_code"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number | null,"cubso_code"?: string | null,"description"?: string | null,"item_id"?: string,"ocid"?: string,"position"?: number | null,"quantity"?: number | null,"status_details"?: string | null,"unit_name"?: string | null,"unspsc_code"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tender_items_ocid_fkey"
      columns: ["ocid"]
isOneToOne: false
      referencedRelation: "pending_alert_notifications"
      referencedColumns: ["ocid"]
    },{
      foreignKeyName: "tender_items_ocid_fkey"
      columns: ["ocid"]
isOneToOne: false
      referencedRelation: "tenders"
      referencedColumns: ["ocid"]
    }
                  ]
                },"tender_matches": {
                  Row: {
                    "id": number,"matched_at": string,"notified_at": string | null,"ocid": string,"profile_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: number,"matched_at"?: string,"notified_at"?: string | null,"ocid": string,"profile_id": number
                  }
                  Update: {
                    "id"?: number,"matched_at"?: string,"notified_at"?: string | null,"ocid"?: string,"profile_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "tender_matches_ocid_fkey"
      columns: ["ocid"]
isOneToOne: false
      referencedRelation: "pending_alert_notifications"
      referencedColumns: ["ocid"]
    },{
      foreignKeyName: "tender_matches_ocid_fkey"
      columns: ["ocid"]
isOneToOne: false
      referencedRelation: "tenders"
      referencedColumns: ["ocid"]
    },{
      foreignKeyName: "tender_matches_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "mype_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tender_participants": {
                  Row: {
                    "name": string | null,"ocid": string,"party_id": string,"ruc": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "name"?: string | null,"ocid": string,"party_id": string,"ruc"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "name"?: string | null,"ocid"?: string,"party_id"?: string,"ruc"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tender_participants_ocid_fkey"
      columns: ["ocid"]
isOneToOne: false
      referencedRelation: "pending_alert_notifications"
      referencedColumns: ["ocid"]
    },{
      foreignKeyName: "tender_participants_ocid_fkey"
      columns: ["ocid"]
isOneToOne: false
      referencedRelation: "tenders"
      referencedColumns: ["ocid"]
    }
                  ]
                },"tenders": {
                  Row: {
                    "amount": number | null,"buyer_name": string | null,"buyer_ruc": string | null,"currency": string | null,"date_published": string | null,"department": string | null,"description": string | null,"enquiry_end": string | null,"enquiry_start": string | null,"locality": string | null,"main_category": string | null,"number_of_tenderers": number | null,"ocid": string,"procurement_method": string | null,"source_release_date": string | null,"tender_end": string | null,"tender_id": string | null,"title": string | null,"unspsc_code": string | null,"unspsc_description": string | null,"unspsc_family": string | null,"unspsc_segment": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number | null,"buyer_name"?: string | null,"buyer_ruc"?: string | null,"currency"?: string | null,"date_published"?: string | null,"department"?: string | null,"description"?: string | null,"enquiry_end"?: string | null,"enquiry_start"?: string | null,"locality"?: string | null,"main_category"?: string | null,"number_of_tenderers"?: number | null,"ocid": string,"procurement_method"?: string | null,"source_release_date"?: string | null,"tender_end"?: string | null,"tender_id"?: string | null,"title"?: string | null,"unspsc_code"?: string | null,"unspsc_description"?: string | null,"unspsc_family"?: string | null,"unspsc_segment"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number | null,"buyer_name"?: string | null,"buyer_ruc"?: string | null,"currency"?: string | null,"date_published"?: string | null,"department"?: string | null,"description"?: string | null,"enquiry_end"?: string | null,"enquiry_start"?: string | null,"locality"?: string | null,"main_category"?: string | null,"number_of_tenderers"?: number | null,"ocid"?: string,"procurement_method"?: string | null,"source_release_date"?: string | null,"tender_end"?: string | null,"tender_id"?: string | null,"title"?: string | null,"unspsc_code"?: string | null,"unspsc_description"?: string | null,"unspsc_family"?: string | null,"unspsc_segment"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"unspsc_families": {
                  Row: {
                    "code": string,"description": string,"tender_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"description": string,"tender_count"?: number
                  }
                  Update: {
                    "code"?: string,"description"?: string,"tender_count"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "pending_alert_notifications": {
                  Row: {
                    "amount": number | null,"buyer_name": string | null,"currency": string | null,"date_published": string | null,"department": string | null,"description": string | null,"digest_hour": number | null,"email_enabled": boolean | null,"enquiry_end": string | null,"match_id": number,"matched_at": string,"ocid": string,"organization_id": string,"organization_name": string,"profile_name": string,"title": string | null,"whatsapp_enabled": boolean | null,"whatsapp_phone": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "alert_matches_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "accept_pending_memberships":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"alert_profile_quota":
{ Args: { "org": string }; Returns: {
              "max_profiles": number,"used": number
            }[]
                           },
"bid_in_org":
{ Args: { "bid": string,"org": string }; Returns: boolean
                           },
"create_organization":
{ Args: { "p_ends_at": string,"p_max_seats": number,"p_name": string,"p_plan_code": string,"p_ruc": string,"p_starts_at": string,"p_status": string }; Returns: string
                           },
"has_active_subscription":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"has_org_role":
{ Args: { "org": string,"roles": (string)[] }; Returns: boolean
                           },
"is_org_member":
{ Args: { "org": string }; Returns: boolean
                           },
"is_platform_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"last_similar_awards":
{ Args: { "p_limit"?: number,"p_ocid": string }; Returns: {
              "amount": number,"award_date": string,"buyer_name": string,"currency": string,"department": string,"item_description": string,"match_level": string,"number_of_tenderers": number,"ocid": string,"quantity": number,"supplier_name": string,"supplier_ruc": string,"tender_description": string,"title": string,"unit_name": string,"unit_price": number
            }[]
                           },
"preview_alert_profile":
{ Args: { "p_days"?: number,"p_departments": (string)[],"p_families": (string)[],"p_max_amount": number,"p_min_amount": number }; Returns: {
              "amount": number,"buyer_name": string,"currency": string,"date_published": string,"department": string,"description": string,"enquiry_end": string,"ocid": string,"title": string,"unspsc_description": string
            }[]
                           },
"refresh_alert_matches":
{ Args: { "days_back"?: number }; Returns: number
                           },
"refresh_tender_matches":
{ Args: { "days_back"?: number }; Returns: number
                           },
"seat_usage":
{ Args: { "org": string }; Returns: {
              "max_seats": number,"used": number
            }[]
                           },
"storage_path_org":
{ Args: { "path": string }; Returns: string
                           },
"tender_fits_profile":
{ Args: { "departments": (string)[],"families": (string)[],"max_amount": number,"min_amount": number,"t": Omit<Database["public"]['Tables']["tenders"]['Row'], Database["public"]['Tables']["tenders"]['ComputedFields']> }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
