-- ============================================================================
-- Clinical Practice Guideline (CPG) Development Platform - Complete Schema
-- ============================================================================
-- Database: Supabase PostgreSQL
-- Purpose: Comprehensive schema for CPG development with RLS, audit logging,
--          and workflow management
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SCHEMA SETUP & HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle audit logging
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
    v_old_record JSONB;
    v_new_record JSONB;
BEGIN
    -- Determine action type
    IF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_old_record := row_to_json(OLD);
        v_new_record := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_action := 'INSERT';
        v_old_record := NULL;
        v_new_record := row_to_json(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_old_record := row_to_json(OLD);
        v_new_record := row_to_json(NEW);
    END IF;

    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        user_id,
        old_values,
        new_values,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_action,
        auth.uid(),
        v_old_record,
        v_new_record,
        CURRENT_TIMESTAMP
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. USER PROFILES TABLE
-- ============================================================================

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'editor', 'reviewer', 'viewer')),
    organization VARCHAR(255),
    specialty VARCHAR(255),
    bio TEXT,
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_organization ON user_profiles(organization);
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);
-- ============================================================================
-- 2. PROJECTS TABLE
-- ============================================================================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    clinical_domain VARCHAR(255) NOT NULL,
    pathway VARCHAR(50) NOT NULL CHECK (pathway IN ('de novo', 'ADAPTE', 'hybrid', 'rapid')),
    status VARCHAR(50) NOT NULL DEFAULT 'planning' CHECK (status IN (
        'planning', 'scoping', 'prioritization', 'sr_planning', 'sr_conduct',
        'evidence_synthesis', 'panel_formation', 'guideline_development',
        'voting', 'finalization', 'review', 'published', 'archived'
    )),
    requesting_body VARCHAR(255),
    rationale TEXT,
    description TEXT,
    lead_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_completion_date DATE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_clinical_domain ON projects(clinical_domain);
CREATE INDEX idx_projects_pathway ON projects(pathway);
CREATE INDEX idx_projects_lead_id ON projects(lead_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- ============================================================================
-- 3. TOPIC SCORES TABLE (Prioritization Matrix)
-- ============================================================================

CREATE TABLE topic_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    topic_name VARCHAR(255) NOT NULL,
    disease_burden_score NUMERIC(5,2),
    evidence_availability_score NUMERIC(5,2),
    stakeholder_priority_score NUMERIC(5,2),
    feasibility_score NUMERIC(5,2),
    equity_score NUMERIC(5,2),
    total_score NUMERIC(5,2),
    rank INTEGER,
    prioritized BOOLEAN DEFAULT false,
    rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_topic_scores_updated_at
    BEFORE UPDATE ON topic_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_topic_scores_project_id ON topic_scores(project_id);
CREATE INDEX idx_topic_scores_prioritized ON topic_scores(prioritized);
CREATE INDEX idx_topic_scores_total_score ON topic_scores(total_score DESC);
-- ============================================================================
-- 4. RECOMMENDATIONS TABLE
-- ============================================================================

CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    recommendation_text TEXT NOT NULL,
    grade_direction VARCHAR(50) NOT NULL CHECK (grade_direction IN (
        'strong for', 'conditional for', 'conditional against', 'strong against', 'no recommendation'
    )),
    certainty_of_evidence VARCHAR(50) CHECK (certainty_of_evidence IN (
        'high', 'moderate', 'low', 'very low'
    )),
    rationale TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'voting', 'consensus', 'no-consensus', 'finalized'
    )),
    etr_harms_score NUMERIC(5,2),
    etr_benefits_score NUMERIC(5,2),
    etr_burden_score NUMERIC(5,2),
    etr_equity_score NUMERIC(5,2),
    etr_acceptability_score NUMERIC(5,2),
    etr_feasibility_score NUMERIC(5,2),
    implementation_notes TEXT,
    evidence_references JSONB,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_recommendations_updated_at
    BEFORE UPDATE ON recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_recommendations_project_id ON recommendations(project_id);
CREATE INDEX idx_recommendations_status ON recommendations(status);
CREATE INDEX idx_recommendations_grade_direction ON recommendations(grade_direction);
CREATE INDEX idx_recommendations_certainty ON recommendations(certainty_of_evidence);
-- ============================================================================
-- 5. COMMITTEE MEMBERS TABLE
-- ============================================================================

CREATE TABLE committee_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'clinical expert', 'methodologist', 'patient rep', 'pharmacist',
        'health economist', 'public health', 'nursing', 'external reviewer', 'chair'
    )),
    organization VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    coi_status VARCHAR(50) DEFAULT 'pending' CHECK (coi_status IN (
        'pending', 'disclosed', 'no-conflict', 'conflict', 'managed', 'excluded'
    )),
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_committee_members_updated_at
    BEFORE UPDATE ON committee_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_committee_members_project_id ON committee_members(project_id);
CREATE INDEX idx_committee_members_user_id ON committee_members(user_id);
CREATE INDEX idx_committee_members_coi_status ON committee_members(coi_status);
CREATE INDEX idx_committee_members_role ON committee_members(role);
CREATE UNIQUE INDEX idx_committee_members_unique ON committee_members(project_id, user_id)
    WHERE user_id IS NOT NULL;
-- ============================================================================
-- 6. COI DECLARATIONS TABLE
-- ============================================================================

CREATE TABLE coi_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    committee_member_id UUID NOT NULL REFERENCES committee_members(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    declaration_text TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'reviewed', 'approved', 'rejected', 'managed'
    )),
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewer_comments TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_coi_declarations_updated_at
    BEFORE UPDATE ON coi_declarations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_coi_declarations_committee_member_id ON coi_declarations(committee_member_id);
CREATE INDEX idx_coi_declarations_project_id ON coi_declarations(project_id);
CREATE INDEX idx_coi_declarations_status ON coi_declarations(status);

-- ============================================================================
-- 7. DELPHI VOTING ROUNDS TABLE
-- ============================================================================

CREATE TABLE delphi_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    round_name VARCHAR(255),
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'planning' CHECK (status IN (
        'planning', 'open', 'closed', 'finalized'
    )),
    agreement_threshold NUMERIC(5,2) DEFAULT 70.00,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_delphi_rounds_updated_at
    BEFORE UPDATE ON delphi_rounds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_delphi_rounds_project_id ON delphi_rounds(project_id);
CREATE INDEX idx_delphi_rounds_status ON delphi_rounds(status);
CREATE INDEX idx_delphi_rounds_round_number ON delphi_rounds(project_id, round_number);
-- ============================================================================
-- 8. VOTES TABLE
-- ============================================================================

CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delphi_round_id UUID NOT NULL REFERENCES delphi_rounds(id) ON DELETE CASCADE,
    recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
    committee_member_id UUID NOT NULL REFERENCES committee_members(id) ON DELETE CASCADE,
    vote_value VARCHAR(50) NOT NULL CHECK (vote_value IN (
        'strongly-agree', 'agree', 'neutral', 'disagree', 'strongly-disagree'
    )),
    comment TEXT,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_votes_updated_at
    BEFORE UPDATE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_votes_delphi_round_id ON votes(delphi_round_id);
CREATE INDEX idx_votes_recommendation_id ON votes(recommendation_id);
CREATE INDEX idx_votes_committee_member_id ON votes(committee_member_id);
CREATE INDEX idx_votes_vote_value ON votes(vote_value);
CREATE UNIQUE INDEX idx_votes_unique ON votes(delphi_round_id, recommendation_id, committee_member_id);

-- ============================================================================
-- 9. WORKFLOW STATES TABLE
-- ============================================================================

CREATE TABLE workflow_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    current_stage INTEGER NOT NULL DEFAULT 1 CHECK (current_stage >= 1 AND current_stage <= 10),
    stage_data JSONB DEFAULT '{}',
    stage_history JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_workflow_states_updated_at
    BEFORE UPDATE ON workflow_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_workflow_states_project_id ON workflow_states(project_id);
CREATE INDEX idx_workflow_states_current_stage ON workflow_states(current_stage);
-- ============================================================================
-- 10. DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'guideline-pdf', 'sr-protocol', 'sr-report', 'evidence-table',
        'guideline-manuscript', 'summary-document', 'implementation-guide',
        'patient-summary', 'other'
    )),
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(50),
    storage_bucket VARCHAR(255) DEFAULT 'cpg-documents',
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    version_number INTEGER DEFAULT 1,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_is_public ON documents(is_public);
-- ============================================================================
-- 11. PUBLISHED GUIDELINES TABLE
-- ============================================================================

CREATE TABLE published_guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID UNIQUE REFERENCES projects(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'published' CHECK (status IN (
        'published', 'in-development', 'overdue', 'under-review', 'retired'
    )),
    publish_date DATE NOT NULL,
    review_due_date DATE,
    specialty VARCHAR(255),
    clinical_domain VARCHAR(255),
    guideline_pdf_path VARCHAR(500),
    agree_ii_score NUMERIC(5,2),
    gin_score NUMERIC(5,2),
    recommendation_count INTEGER DEFAULT 0,
    panel_members_count INTEGER DEFAULT 0,
    key_recommendations TEXT,
    doi VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_published_guidelines_updated_at
    BEFORE UPDATE ON published_guidelines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_published_guidelines_status ON published_guidelines(status);
CREATE INDEX idx_published_guidelines_specialty ON published_guidelines(specialty);
CREATE INDEX idx_published_guidelines_publish_date ON published_guidelines(publish_date DESC);
CREATE INDEX idx_published_guidelines_project_id ON published_guidelines(project_id);
-- ============================================================================
-- 12. TRASH BIN TABLE (Soft Deletes)
-- ============================================================================

CREATE TABLE trash_bin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guideline_id UUID NOT NULL REFERENCES published_guidelines(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    deleted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    deletion_reason TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    purge_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days',
    guideline_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trash_bin_guideline_id ON trash_bin(guideline_id);
CREATE INDEX idx_trash_bin_deleted_at ON trash_bin(deleted_at DESC);
CREATE INDEX idx_trash_bin_purge_date ON trash_bin(purge_date);

-- ============================================================================
-- 13. AUDIT LOGS TABLE (Immutable Audit Trail)
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
-- ============================================================================
-- AUDIT TRIGGERS (Attach to all mutable tables)
-- ============================================================================

CREATE TRIGGER audit_projects
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_recommendations
    AFTER INSERT OR UPDATE OR DELETE ON recommendations
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_committee_members
    AFTER INSERT OR UPDATE OR DELETE ON committee_members
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_delphi_rounds
    AFTER INSERT OR UPDATE OR DELETE ON delphi_rounds
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_votes
    AFTER INSERT OR UPDATE OR DELETE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_published_guidelines
    AFTER INSERT OR UPDATE OR DELETE ON published_guidelines
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_trigger();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE coi_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delphi_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE trash_bin ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- Helper function to check user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR AS $$
BEGIN
    RETURN (SELECT role FROM user_profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is project member (editor/reviewer)
CREATE OR REPLACE FUNCTION is_project_member(project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM committee_members
        WHERE committee_members.project_id = $1
        AND committee_members.user_id = auth.uid()
        AND committee_members.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- USER PROFILES RLS POLICIES
-- ============================================================================

CREATE POLICY "Admin can view all profiles" ON user_profiles
    FOR SELECT USING (is_admin());

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin can update all profiles" ON user_profiles
    FOR UPDATE USING (is_admin());

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (is_admin());
-- ============================================================================
-- PROJECTS RLS POLICIES
-- ============================================================================

CREATE POLICY "Admin can view all projects" ON projects
    FOR SELECT USING (is_admin());

CREATE POLICY "Editors and reviewers can view assigned projects" ON projects
    FOR SELECT USING (
        is_admin() OR
        is_project_member(id) OR
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'editor'
    );

CREATE POLICY "Viewers can view published guidelines only" ON projects
    FOR SELECT USING (
        is_admin() OR
        status = 'published' OR
        is_project_member(id)
    );

CREATE POLICY "Admin can insert projects" ON projects
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Editors can insert projects" ON projects
    FOR INSERT WITH CHECK (
        is_admin() OR
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'editor'
    );

CREATE POLICY "Project lead can update own project" ON projects
    FOR UPDATE USING (
        is_admin() OR
        auth.uid() = lead_id OR
        (is_project_member(id) AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'editor')
    );

CREATE POLICY "Admin can delete projects" ON projects
    FOR DELETE USING (is_admin());
-- ============================================================================
-- TOPIC SCORES RLS POLICIES
-- ============================================================================

CREATE POLICY "Admin and project members can view topic scores" ON topic_scores
    FOR SELECT USING (
        is_admin() OR
        is_project_member(project_id) OR
        (SELECT status FROM projects WHERE id = project_id) = 'published'
    );

CREATE POLICY "Editors can insert topic scores" ON topic_scores
    FOR INSERT WITH CHECK (
        is_admin() OR
        is_project_member(project_id)
    );

CREATE POLICY "Editors can update topic scores" ON topic_scores
    FOR UPDATE USING (
        is_admin() OR
        is_project_member(project_id)
    );

-- ============================================================================
-- RECOMMENDATIONS RLS POLICIES
-- ============================================================================

CREATE POLICY "Admin and project members can view recommendations" ON recommendations
    FOR SELECT USING (
        is_admin() OR
        is_project_member(project_id) OR
        (SELECT status FROM projects WHERE id = project_id) = 'published'
    );

CREATE POLICY "Editors can insert recommendations" ON recommendations
    FOR INSERT WITH CHECK (
        is_admin() OR
        is_project_member(project_id)
    );

CREATE POLICY "Editors can update recommendations" ON recommendations
    FOR UPDATE USING (
        is_admin() OR
        is_project_member(project_id)
    );

CREATE POLICY "Admin can delete recommendations" ON recommendations
    FOR DELETE USING (is_admin());
-- ============================================================================
-- COMMITTEE MEMBERS RLS POLICIES
-- ============================================================================

CREATE POLICY "Admin and project members can view committee" ON committee_members
    FOR SELECT USING (
        is_admin() OR
        is_project_member(project_id) OR
        auth.uid() = user_id
    );

CREATE POLICY "Editors can manage committee" ON committee_members
    FOR INSERT WITH CHECK (
        is_admin() OR
        is_project_member(project_id)
    );

CREATE POLICY "Editors can update committee members" ON committee_members
    FOR UPDATE USING (
        is_admin() OR
        is_project_member(project_id)
    );

CREATE POLICY "Admin can delete committee members" ON committee_members
    FOR DELETE USING (is_admin());

-- ============================================================================
-- COI DECLARATIONS RLS POLICIES
-- ============================================================================

CREATE POLICY "Admin and members can view COI declarations" ON coi_declarations
    FOR SELECT USING (
        is_admin() OR
        auth.uid() = (SELECT user_id FROM committee_members WHERE id = committee_member_id)
    );

CREATE POLICY "Members can submit COI declarations" ON coi_declarations
    FOR INSERT WITH CHECK (
        auth.uid() = (SELECT user_id FROM committee_members WHERE id = committee_member_id)
    );

CREATE POLICY "Admin can review COI declarations" ON coi_declarations
    FOR UPDATE USING (is_admin());
-- ============================================================================
-- DELPHI ROUNDS RLS POLICIES
-- ============================================================================

CREATE POLICY "Admin and project members can view delphi rounds" ON delphi_rounds
    FOR SELECT USING (
        is_admin() OR
        is_project_member(project_id)
    );

CREATE POLICY "Editors can manage delphi rounds" ON delphi_rounds
    FOR INSERT WITH CHECK (
        is_admin() OR
        is_project_member(project_id)
    );

CREATE POLICY "Editors can update delphi rounds" ON delphi_rounds
    FOR UPDATE USING (
        is_admin() OR
        is_project_member(project_id)
    );

-- ============================================================================
-- VOTES RLS POLICIES
-- ============================================================================

CREATE POLICY "Admin and reviewers can view votes" ON votes
    FOR SELECT USING (
        is_admin() OR
        auth.uid() = (SELECT user_id FROM committee_members WHERE id = committee_member_id)
    );

CREATE POLICY "Committee members can submit votes" ON votes
    FOR INSERT WITH CHECK (
        auth.uid() = (SELECT user_id FROM committee_members WHERE id = committee_member_id)
    );

CREATE POLICY "Committee members can update own votes" ON votes
    FOR UPDATE USING (
        is_admin() OR
        auth.uid() = (SELECT user_id FROM committee_members WHERE id = committee_member_id)
    );
-- ============================================================================
-- WORKFLOW STATES RLS POLICIES
-- ============================================================================

CREATE POLICY "Admin and project members can view workflow" ON workflow_states
    FOR SELECT USING (
        is_admin() OR
        is_project_member(project_id)
    );

CREATE POLICY "Editors can update workflow" ON workflow_states
    FOR UPDATE USING (
        is_admin() OR
        is_project_member(project_id)
    );

-- ============================================================================
-- DOCUMENTS RLS POLICIES
-- ============================================================================

CREATE POLICY "Admin and project members can view documents" ON documents
    FOR SELECT USING (
        is_admin() OR
        is_project_member(project_id) OR
        is_public = true
    );

CREATE POLICY "Project members can upload documents" ON documents
    FOR INSERT WITH CHECK (
        is_admin() OR
        is_project_member(project_id)
    );

CREATE POLICY "Editors can update documents" ON documents
    FOR UPDATE USING (
        is_admin() OR
        is_project_member(project_id)
    );

CREATE POLICY "Editors can delete documents" ON documents
    FOR DELETE USING (
        is_admin() OR
        is_project_member(project_id)
    );
-- ============================================================================
-- PUBLISHED GUIDELINES RLS POLICIES
-- ============================================================================

CREATE POLICY "Everyone can view published guidelines" ON published_guidelines
    FOR SELECT USING (
        status = 'published' OR
        is_admin() OR
        is_project_member(project_id)
    );

CREATE POLICY "Editors can create published guidelines" ON published_guidelines
    FOR INSERT WITH CHECK (
        is_admin() OR
        is_project_member(project_id)
    );

CREATE POLICY "Editors can update published guidelines" ON published_guidelines
    FOR UPDATE USING (
        is_admin() OR
        is_project_member(project_id)
    );

CREATE POLICY "Admin can delete published guidelines" ON published_guidelines
    FOR DELETE USING (is_admin());

-- ============================================================================
-- TRASH BIN RLS POLICIES
-- ============================================================================

CREATE POLICY "Admin can view trash" ON trash_bin
    FOR SELECT USING (is_admin());

CREATE POLICY "Admin can delete from trash" ON trash_bin
    FOR DELETE USING (is_admin());

-- ============================================================================
-- AUDIT LOGS RLS POLICIES
-- ============================================================================

CREATE POLICY "Admin can view audit logs" ON audit_logs
    FOR SELECT USING (is_admin());
-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Note: Replace 'YOUR-UUID-HERE' with actual user IDs from Supabase auth.users
-- This section provides examples of seed data structure

-- Example user profiles (uncomment and modify with real UUIDs)
/*
INSERT INTO user_profiles (id, full_name, role, organization, specialty, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin', 'CPG Platform', 'Administration', true),
('00000000-0000-0000-0000-000000000002', 'Editor User', 'editor', 'Medical Institute', 'Cardiology', true),
('00000000-0000-0000-0000-000000000003', 'Reviewer User', 'reviewer', 'Medical Institute', 'Methodology', true),
('00000000-0000-0000-0000-000000000004', 'Viewer User', 'viewer', 'Clinical Facility', 'Practice', true);

-- Example project
INSERT INTO projects (
    title, clinical_domain, pathway, status, requesting_body,
    rationale, lead_id, created_by
) VALUES (
    'Hypertension Management Guidelines',
    'Cardiology',
    'ADAPTE',
    'planning',
    'American Heart Association',
    'Development of evidence-based hypertension management guidelines',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001'
);
*/

-- ============================================================================
-- MAINTENANCE & UTILITY VIEWS
-- ============================================================================

-- View for active projects with member counts
CREATE OR REPLACE VIEW v_active_projects_summary AS
SELECT
    p.id,
    p.title,
    p.clinical_domain,
    p.status,
    p.pathway,
    p.created_at,
    COUNT(DISTINCT cm.id) as member_count,
    COUNT(DISTINCT r.id) as recommendation_count,
    (SELECT COUNT(*) FROM delphi_rounds WHERE project_id = p.id) as delphi_round_count
FROM projects p
LEFT JOIN committee_members cm ON p.id = cm.project_id AND cm.is_active = true
LEFT JOIN recommendations r ON p.id = r.project_id
WHERE p.status != 'archived'
GROUP BY p.id, p.title, p.clinical_domain, p.status, p.pathway, p.created_at
ORDER BY p.created_at DESC;
-- View for voting consensus summary
CREATE OR REPLACE VIEW v_voting_consensus_summary AS
SELECT
    v.recommendation_id,
    dr.round_number,
    v.vote_value,
    COUNT(*) as vote_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY v.recommendation_id, dr.round_number), 2) as percentage
FROM votes v
JOIN delphi_rounds dr ON v.delphi_round_id = dr.id
GROUP BY v.recommendation_id, dr.round_number, v.vote_value
ORDER BY v.recommendation_id, dr.round_number, v.vote_value;

-- View for committee member status
CREATE OR REPLACE VIEW v_committee_status AS
SELECT
    cm.project_id,
    cm.id as member_id,
    cm.full_name,
    cm.email,
    cm.role,
    cm.coi_status,
    cm.is_active,
    COUNT(DISTINCT v.id) as votes_submitted,
    COUNT(DISTINCT cd.id) as coi_declarations
FROM committee_members cm
LEFT JOIN votes v ON cm.id = v.committee_member_id
LEFT JOIN coi_declarations cd ON cm.id = cd.committee_member_id
GROUP BY cm.project_id, cm.id, cm.full_name, cm.email, cm.role, cm.coi_status, cm.is_active;

-- ============================================================================
-- GRANTS (Adjust based on your Supabase user setup)
-- ============================================================================

-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_project_member(UUID) TO authenticated;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================