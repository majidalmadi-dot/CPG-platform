(function() {
  'use strict';

  var _cache = {};
  var _user = null;

  function _getClient() {
    return window.supabaseClient;
  }

  async function _getCurrentUser() {
    if (_user) return _user;
    try {
      var { data } = await _getClient().auth.getUser();
      _user = data?.user || null;
      return _user;
    } catch (err) {
      console.error('Error getting current user:', err);
      return null;
    }
  }

  // --- AUDIT LOG ---
  async function auditLog(action, entityType, entityId, details) {
    try {
      var user = await _getCurrentUser();
      if (!user) return;
      
      await _getClient().from('audit_logs').insert({
        user_id: user.id,
        action: action,
        entity_type: entityType,
        entity_id: entityId,
        details: details || {},
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Audit log error:', err);
    }
  }

  // --- PROJECTS ---
  var projects = {
    async list(filters) {
      try {
        var query = _getClient().from('projects').select('*');
        
        if (filters) {
          if (filters.status) query = query.eq('status', filters.status);
          if (filters.search) query = query.ilike('name', '%' + filters.search + '%');
        }
        
        var { data, error } = await query.order('created_at', { ascending: false });
        if (error) return { error: error.message };
        return data || [];
      } catch (err) {
        return { error: err.message };
      }
    },

    async get(id) {
      try {
        if (_cache['project_' + id]) return _cache['project_' + id];
        
        var { data, error } = await _getClient()
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) return { error: error.message };
        _cache['project_' + id] = data;
        return data;
      } catch (err) {
        return { error: err.message };
      }
    },

    async create(data) {
      try {
        var user = await _getCurrentUser();
        var payload = {
          name: data.name,
          description: data.description || null,
          status: data.status || 'planning',
          created_by: user?.id,
          created_at: new Date().toISOString()
        };

        var { data: result, error } = await _getClient()
          .from('projects')
          .insert(payload)
          .select()
          .single();

        if (error) return { error: error.message };
        
        await auditLog('CREATE', 'Project', result.id, payload);
        _cache = {};
        return result;
      } catch (err) {
        return { error: err.message };
      }
    },

    async update(id, data) {
      try {
        var payload = {};
        if (data.name !== undefined) payload.name = data.name;
        if (data.description !== undefined) payload.description = data.description;
        if (data.status !== undefined) payload.status = data.status;
        payload.updated_at = new Date().toISOString();

        var { data: result, error } = await _getClient()
          .from('projects')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) return { error: error.message };
        
        await auditLog('UPDATE', 'Project', id, payload);
        delete _cache['project_' + id];
        return result;
      } catch (err) {
        return { error: err.message };
      }
    },

    async delete(id) {
      try {
        var { error } = await _getClient()
          .from('projects')
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq('id', id);

        if (error) return { error: error.message };
        
        await auditLog('DELETE', 'Project', id, {});
        delete _cache['project_' + id];
        return { success: true };
      } catch (err) {
        return { error: err.message };
      }
    }
  };

  // --- RECOMMENDATIONS ---
  var recommendations = {
    async listByProject(projectId) {
      try {
        var { data, error } = await _getClient()
          .from('recommendations')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false });

        if (error) return { error: error.message };
        return data || [];
      } catch (err) {
        return { error: err.message };
      }
    },

    async create(projectId, data) {
      try {
        var user = await _getCurrentUser();
        var payload = {
          project_id: projectId,
          title: data.title,
          description: data.description || null,
          recommendation_type: data.type || 'general',
          evidence: data.evidence || null,
          status: data.status || 'draft',
          created_by: user?.id,
          created_at: new Date().toISOString()
        };

        var { data: result, error } = await _getClient()
          .from('recommendations')
          .insert(payload)
          .select()
          .single();

        if (error) return { error: error.message };
        
        await auditLog('CREATE', 'Recommendation', result.id, payload);
        return result;
      } catch (err) {
        return { error: err.message };
      }
    },

    async update(id, data) {
      try {
        var payload = {};
        if (data.title !== undefined) payload.title = data.title;
        if (data.description !== undefined) payload.description = data.description;
        if (data.type !== undefined) payload.recommendation_type = data.type;
        if (data.evidence !== undefined) payload.evidence = data.evidence;
        if (data.status !== undefined) payload.status = data.status;
        payload.updated_at = new Date().toISOString();

        var { data: result, error } = await _getClient()
          .from('recommendations')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) return { error: error.message };
        
        await auditLog('UPDATE', 'Recommendation', id, payload);
        return result;
      } catch (err) {
        return { error: err.message };
      }
    },

    async delete(id) {
      try {
        var { error } = await _getClient()
          .from('recommendations')
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq('id', id);

        if (error) return { error: error.message };
        
        await auditLog('DELETE', 'Recommendation', id, {});
        return { success: true };
      } catch (err) {
        return { error: err.message };
      }
    }
  };

  // --- COMMITTEE ---
  var committee = {
    async listByProject(projectId) {
      try {
        var { data, error } = await _getClient()
          .from('committee_members')
          .select('*, users(*)')
          .eq('project_id', projectId)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (error) return { error: error.message };
        return data || [];
      } catch (err) {
        return { error: err.message };
      }
    },

    async add(projectId, data) {
      try {
        var user = await _getCurrentUser();
        var payload = {
          project_id: projectId,
          user_id: data.user_id,
          role: data.role || 'member',
          expertise: data.expertise || null,
          is_active: true,
          added_by: user?.id,
          created_at: new Date().toISOString()
        };

        var { data: result, error } = await _getClient()
          .from('committee_members')
          .insert(payload)
          .select()
          .single();

        if (error) return { error: error.message };
        
        await auditLog('ADD', 'CommitteeMember', result.id, payload);
        return result;
      } catch (err) {
        return { error: err.message };
      }
    },

    async remove(id) {
      try {
        var { error } = await _getClient()
          .from('committee_members')
          .update({ is_active: false, removed_at: new Date().toISOString() })
          .eq('id', id);

        if (error) return { error: error.message };
        
        await auditLog('REMOVE', 'CommitteeMember', id, {});
        return { success: true };
      } catch (err) {
        return { error: err.message };
      }
    },

    async updateCOI(id, coiData) {
      try {
        var payload = {
          coi_disclosed: coiData.disclosed || null,
          coi_conflict_exists: coiData.exists || false,
          coi_details: coiData.details || null,
          coi_updated_at: new Date().toISOString()
        };

        var { data: result, error } = await _getClient()
          .from('committee_members')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) return { error: error.message };
        
        await auditLog('UPDATE_COI', 'CommitteeMember', id, payload);
        return result;
      } catch (err) {
        return { error: err.message };
      }
    }
  };

  // --- DELPHI VOTING ---
  var delphi = {
    async getRound(projectId, roundNum) {
      try {
        var { data, error } = await _getClient()
          .from('delphi_rounds')
          .select('*')
          .eq('project_id', projectId)
          .eq('round_number', roundNum)
          .single();

        if (error) return { error: error.message };
        return data;
      } catch (err) {
        return { error: err.message };
      }
    },

    async createRound(projectId, data) {
      try {
        var user = await _getCurrentUser();
        var payload = {
          project_id: projectId,
          round_number: data.round_number,
          status: data.status || 'open',
          instructions: data.instructions || null,
          created_by: user?.id,
          created_at: new Date().toISOString()
        };

        var { data: result, error } = await _getClient()
          .from('delphi_rounds')
          .insert(payload)
          .select()
          .single();

        if (error) return { error: error.message };
        
        await auditLog('CREATE', 'DelphiRound', result.id, payload);
        return result;
      } catch (err) {
        return { error: err.message };
      }
    },

    async submitVote(roundId, memberId, recId, data) {
      try {
        var user = await _getCurrentUser();
        var payload = {
          round_id: roundId,
          member_id: memberId,
          recommendation_id: recId,
          score: data.score,
          rationale: data.rationale || null,
          submitted_at: new Date().toISOString()
        };

        var { data: result, error } = await _getClient()
          .from('delphi_votes')
          .insert(payload)
          .select()
          .single();

        if (error) return { error: error.message };
        
        await auditLog('VOTE', 'DelphiVote', result.id, { score: data.score });
        return result;
      } catch (err) {
        return { error: err.message };
      }
    },

    async getResults(projectId) {
      try {
        var { data, error } = await _getClient()
          .from('delphi_votes')
          .select('recommendation_id, score, round_id')
          .eq('delphi_rounds.project_id', projectId);

        if (error) return { error: error.message };
        return data || [];
      } catch (err) {
        return { error: err.message };
      }
    },

    async checkConsensus(projectId, roundNum, threshold) {
      try {
        var results = await delphi.getResults(projectId);
        if (results.error) return results;

        var consensus = {};
        results.forEach(function(vote) {
          if (!consensus[vote.recommendation_id]) {
            consensus[vote.recommendation_id] = [];
          }
          consensus[vote.recommendation_id].push(vote.score);
        });

        var consensusReached = {};
        Object.keys(consensus).forEach(function(recId) {
          var scores = consensus[recId];
          var avg = scores.reduce(function(a, b) { return a + b; }, 0) / scores.length;
          var stdDev = Math.sqrt(
            scores.reduce(function(sq, n) { return sq + Math.pow(n - avg, 2); }, 0) / scores.length
          );
          consensusReached[recId] = stdDev < threshold;
        });

        return consensusReached;
      } catch (err) {
        return { error: err.message };
      }
    }
  };

  // --- GUIDELINES ---
  var guidelines = {
    async list(filters) {
      try {
        var query = _getClient().from('guidelines').select('*').eq('is_deleted', false);

        if (filters) {
          if (filters.category) query = query.eq('category', filters.category);
          if (filters.search) query = query.ilike('title', '%' + filters.search + '%');
        }

        var { data, error } = await query.order('created_at', { ascending: false });
        if (error) return { error: error.message };
        return data || [];
      } catch (err) {
        return { error: err.message };
      }
    },

    async get(id) {
      try {
        var { data, error } = await _getClient()
          .from('guidelines')
          .select('*')
          .eq('id', id)
          .eq('is_deleted', false)
          .single();

        if (error) return { error: error.message };
        return data;
      } catch (err) {
        return { error: err.message };
      }
    },

    async create(data) {
      try {
        var user = await _getCurrentUser();
        var payload = {
          title: data.title,
          content: data.content,
          category: data.category || 'general',
          version: 1,
          is_published: data.is_published || false,
          created_by: user?.id,
          created_at: new Date().toISOString()
        };

        var { data: result, error } = await _getClient()
          .from('guidelines')
          .insert(payload)
          .select()
          .single();

        if (error) return { error: error.message };
        
        await auditLog('CREATE', 'Guideline', result.id, payload);
        return result;
      } catch (err) {
        return { error: err.message };
      }
    },

    async update(id, data) {
      try {
        var payload = {};
        if (data.title !== undefined) payload.title = data.title;
        if (data.content !== undefined) payload.content = data.content;
        if (data.category !== undefined) payload.category = data.category;
        if (data.is_published !== undefined) payload.is_published = data.is_published;
        payload.updated_at = new Date().toISOString();

        var { data: result, error } = await _getClient()
          .from('guidelines')
          .update(payload)
          .eq('id', id)
          .eq('is_deleted', false)
          .select()
          .single();

        if (error) return { error: error.message };
        
        await auditLog('UPDATE', 'Guideline', id, payload);
        return result;
      } catch (err) {
        return { error: err.message };
      }
    },

    async trash(id) {
      try {
        var { error } = await _getClient()
          .from('guidelines')
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq('id', id);

        if (error) return { error: error.message };
        
        await auditLog('TRASH', 'Guideline', id, {});
        return { success: true };
      } catch (err) {
        return { error: err.message };
      }
    },

    async restore(id) {
      try {
        var { error } = await _getClient()
          .from('guidelines')
          .update({ is_deleted: false, deleted_at: null })
          .eq('id', id);

        if (error) return { error: error.message };
        
        await auditLog('RESTORE', 'Guideline', id, {});
        return { success: true };
      } catch (err) {
        return { error: err.message };
      }
    },

    async listTrash() {
      try {
        var { data, error } = await _getClient()
          .from('guidelines')
          .select('*')
          .eq('is_deleted', true)
          .order('deleted_at', { ascending: false });

        if (error) return { error: error.message };
        return data || [];
      } catch (err) {
        return { error: err.message };
      }
    },

    async emptyTrash() {
      try {
        var { error } = await _getClient()
          .from('guidelines')
          .delete()
          .eq('is_deleted', true);

        if (error) return { error: error.message };
        
        await auditLog('EMPTY_TRASH', 'Guidelines', null, {});
        return { success: true };
      } catch (err) {
        return { error: err.message };
      }
    }
  };

  // --- WORKFLOW ---
  var workflow = {
    async getState(projectId) {
      try {
        var { data, error } = await _getClient()
          .from('workflow_states')
          .select('*')
          .eq('project_id', projectId)
          .single();

        if (error) return { error: error.message };
        return data;
      } catch (err) {
        return { error: err.message };
      }
    },

    async updateStage(projectId, stage, data) {
      try {
        var user = await _getCurrentUser();
        var payload = {
          current_stage: stage,
          stage_data: data || {},
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        };

        var { data: result, error } = await _getClient()
          .from('workflow_states')
          .update(payload)
          .eq('project_id', projectId)
          .select()
          .single();

        if (error) return { error: error.message };
        
        await auditLog('UPDATE_STAGE', 'Workflow', projectId, { stage: stage });
        return result;
      } catch (err) {
        return { error: err.message };
      }
    }
  };

  // --- USERS ---
  var users = {
    async getCurrent() {
      try {
        return await _getCurrentUser();
      } catch (err) {
        return { error: err.message };
      }
    },

    async getProfile() {
      try {
        var user = await _getCurrentUser();
        if (!user) return null;

        var { data, error } = await _getClient()
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) return { error: error.message };
        return data;
      } catch (err) {
        return { error: err.message };
      }
    },

    async isAdmin() {
      try {
        var profile = await users.getProfile();
        if (profile.error) return false;
        return profile && profile.role === 'admin';
      } catch (err) {
        return false;
      }
    },

    async listAll() {
      try {
        var isAdmin = await users.isAdmin();
        if (!isAdmin) return { error: 'Unauthorized' };

        var { data, error } = await _getClient()
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) return { error: error.message };
        return data || [];
      } catch (err) {
        return { error: err.message };
      }
    }
  };

  // --- REAL-TIME ---
  function subscribe(table, callback) {
    try {
      var subscription = _getClient()
        .channel('public:' + table)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: table },
          callback
        )
        .subscribe();

      return subscription;
    } catch (err) {
      console.error('Subscription error:', err);
      return null;
    }
  }

  function unsubscribe(subscription) {
    if (subscription) {
      _getClient().removeChannel(subscription);
    }
  }

  // --- MIGRATION from localStorage ---
  async function migrate() {
    try {
      console.log('Starting migration from localStorage to Supabase...');
      
      var user = await _getCurrentUser();
      if (!user) return { error: 'No authenticated user' };

      var localData = {};
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.startsWith('cpg_')) {
          localData[key] = JSON.parse(localStorage.getItem(key));
        }
      }

      console.log('Found ' + Object.keys(localData).length + ' items to migrate');
      
      // Migrate projects
      if (localData.cpg_projects) {
        for (var i = 0; i < localData.cpg_projects.length; i++) {
          var proj = localData.cpg_projects[i];
          await projects.create(proj);
        }
      }

      // Migrate guidelines
      if (localData.cpg_guidelines) {
        for (var i = 0; i < localData.cpg_guidelines.length; i++) {
          var guide = localData.cpg_guidelines[i];
          await guidelines.create(guide);
        }
      }

      console.log('Migration complete');
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }

  // --- INIT ---
  async function init() {
    _user = null;
    _cache = {};
    await _getCurrentUser();
    return { ready: true };
  }

  // --- EXPOSE GLOBAL API ---
  window.DAL = {
    init: init,
    projects: projects,
    recommendations: recommendations,
    committee: committee,
    delphi: delphi,
    guidelines: guidelines,
    workflow: workflow,
    users: users,
    audit: { log: auditLog },
    subscribe: subscribe,
    unsubscribe: unsubscribe,
    migrate: migrate
  };
})();