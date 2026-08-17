// 우리집식당 — 화면별 localStorage 호출을 대체하는 도메인 함수 모음.
// supabase-client.js 다음에 로드. 전역 객체 API에 도메인별로 묶어둠.
// 실제 테이블은 이미 존재하던 백엔드(_vc2608 접미사)를 그대로 사용(2026-08-17, 이어서 쓰기로 결정).

var API = {};

// ---------------------------------------------------------
// 인증
// ---------------------------------------------------------
API.auth = {
  async signUp(email, password, name) {
    var res = await sb.auth.signUp({
      email: email,
      password: password,
      options: { data: { name: name } }
    });
    if (res.error) throw res.error;
    return res.data;
  },

  async signInPassword(email, password) {
    var res = await sb.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw res.error;
    return res.data;
  },

  async signInKakao() {
    var res = await sb.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/../2-1.로그인 화면/code.html') }
    });
    if (res.error) throw res.error;
    return res.data;
  },

  async signOut() {
    await sb.auth.signOut();
  },

  // 회원가입 직후 profiles_vc2608에 phone/address/avatar를 채워넣음(트리거가 만든 name-only 행을 보강)
  async updateMyProfile(fields) {
    var session = await getSession();
    if (!session) throw new Error('로그인 필요');
    var res = await sb.from('profiles_vc2608').update(fields).eq('id', session.user.id);
    if (res.error) throw res.error;
  }
};

// ---------------------------------------------------------
// Storage — 프로필 사진 업로드 (크롭된 canvas blob을 받음)
// ---------------------------------------------------------
API.storage = {
  async uploadAvatar(pathPrefix, blob, label) {
    var path = pathPrefix + '/avatar-' + (label || Date.now()) + '.png';
    var up = await sb.storage.from('avatars').upload(path, blob, { contentType: 'image/png', upsert: true });
    if (up.error) throw up.error;
    var pub = sb.storage.from('avatars').getPublicUrl(path);
    return pub.data.publicUrl;
  }
};

// ---------------------------------------------------------
// 가구 / 멤버 (household_members_vc2608 — 무가입 멤버는 profile_id null)
// ---------------------------------------------------------
API.households = {
  async create(name) {
    // 회원가입 트리거 이전에 만들어진 계정(예: 다른 프로젝트에서 넘어온 테스트 계정)은
    // profiles_vc2608 행이 없을 수 있음 — households_vc2608.owner_id가 profiles_vc2608을
    // 참조하므로, 없으면 여기서 만들어 자연스럽게 복구.
    var session = await getSession();
    if (session) {
      var upsert = await sb.from('profiles_vc2608')
        .upsert({ id: session.user.id, name: session.user.user_metadata && session.user.user_metadata.name || session.user.email.split('@')[0] },
                { onConflict: 'id', ignoreDuplicates: true });
      if (upsert.error) throw upsert.error;
    }

    var res = await sb.rpc('create_household_vc2608', { household_name: name });
    if (res.error) throw res.error;
    return res.data;
  },

  async get(householdId) {
    var res = await sb.from('households_vc2608').select('*').eq('id', householdId).single();
    if (res.error) throw res.error;
    return res.data;
  },

  // 오너만 가능(RLS households_vc2608_delete_owner)
  async remove(householdId) {
    var res = await sb.from('households_vc2608').delete().eq('id', householdId).select();
    if (res.error) throw res.error;
    if (!res.data.length) throw new Error('오너만 가구를 삭제할 수 있어요.');
  }
};

API.members = {
  // create_household_vc2608가 이미 "나"를 owner로 넣어두므로, 여기선 그 행을 이름/사진으로
  // 채우고(update) 나머지 무가입 구성원은 새로 insert.
  async bulkCreate(householdId, members) {
    var session = await getSession();
    if (!session) throw new Error('로그인 필요');
    var results = [];
    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      if (m.isMe) {
        var upd = await sb.from('household_members_vc2608')
          .update({ name: m.name, avatar_url: m.avatar_url || null, color: m.color || null, default_response: m.defaultResponse || 'attending' })
          .eq('household_id', householdId).eq('profile_id', session.user.id)
          .select().single();
        if (upd.error) throw upd.error;
        results.push(upd.data);
      } else {
        var ins = await sb.from('household_members_vc2608').insert({
          household_id: householdId, profile_id: null, name: m.name,
          avatar_url: m.avatar_url || null, color: m.color || null,
          default_response: m.defaultResponse || 'attending', role: 'member'
        }).select().single();
        if (ins.error) throw ins.error;
        results.push(ins.data);
      }
    }
    return results;
  },

  // 3-2에서 즉석으로 입력한 손님도 무가입 구성원으로 등록(role: 'guest') — 재사용·통계·개인 링크가
  // 가족 구성원과 동일하게 적용되도록. 가구 구성원 목록 화면(5-1)에서는 role='guest'는 숨김.
  async addGuestMember(householdId, name) {
    var res = await sb.from('household_members_vc2608').insert({
      household_id: householdId, profile_id: null, name: name, role: 'guest', default_response: 'attending'
    }).select().single();
    if (res.error) throw res.error;
    return res.data;
  },

  async list(householdId) {
    var res = await sb.from('household_members_vc2608').select('*').eq('household_id', householdId).order('joined_at');
    if (res.error) throw res.error;
    return res.data;
  },

  async setRole(memberId, role) {
    var res = await sb.from('household_members_vc2608').update({ role: role }).eq('id', memberId);
    if (res.error) throw res.error;
  },

  // 무가입(계정 없음) 참여자가 1인1링크로 응답만 하다가 실제로 가입할 때(§7.6 B방식) —
  // 새로 만든 계정을 기존 household_members_vc2608 행(무가입 상태)에 연결. 로그인 직후에 호출해야 함.
  async claimViaToken(tokenHash) {
    var res = await sb.rpc('claim_member_via_token_vc2608', { p_token_hash: tokenHash });
    if (res.error) throw res.error;
    return res.data;
  }
};

// ---------------------------------------------------------
// 저장된 손님
// ---------------------------------------------------------
API.savedGuests = {
  async list(householdId) {
    var res = await sb.from('saved_guests_vc2608').select('*').eq('household_id', householdId).order('name');
    if (res.error) throw res.error;
    return res.data;
  },

  async add(householdId, name) {
    var res = await sb.from('saved_guests_vc2608').insert({ household_id: householdId, name: name }).select().single();
    if (res.error) throw res.error;
    return res.data;
  }
};

// ---------------------------------------------------------
// 식사 / 참여자 / 응답
// ---------------------------------------------------------
API.meals = {
  // fields: {date, time, kind('집밥'|'외식'|'배달'), menu(array), note, status}
  async create(householdId, fields) {
    var session = await getSession();
    var res = await sb.from('meals_vc2608').insert({
      household_id: householdId,
      creator_id: session.user.id,
      date: fields.date,
      time: fields.time || null,
      kind: fields.kind,
      menu: fields.menu || [],
      note: fields.note || '',
      status: fields.status || 'open'
    }).select().single();
    if (res.error) throw res.error;
    return res.data;
  },

  async update(mealId, fields) {
    var res = await sb.from('meals_vc2608').update(fields).eq('id', mealId).select().single();
    if (res.error) throw res.error;
    return res.data;
  },

  async get(mealId) {
    var res = await sb.from('meals_vc2608').select('*').eq('id', mealId).single();
    if (res.error) throw res.error;
    return res.data;
  },

  async listByHousehold(householdId) {
    var res = await sb.from('meals_vc2608').select('*').eq('household_id', householdId).order('date', { ascending: false });
    if (res.error) throw res.error;
    return res.data;
  }
};

API.mealParticipants = {
  // memberIds에 대해 meal_participants_vc2608 행 + 1인1링크 토큰을 새로 만듦.
  // 반환값의 token은 이번 호출에서만 알 수 있음(디비엔 해시만 저장) — 바로 공유 URL 생성에 사용.
  async bulkCreateWithTokens(mealId, memberIds) {
    var results = [];
    for (var i = 0; i < memberIds.length; i++) {
      var token = crypto.randomUUID();
      var tokenHash = await sha256Hex(token);
      var res = await sb.from('meal_participants_vc2608').insert({
        meal_id: mealId, member_id: memberIds[i], response_token_hash: tokenHash
      }).select().single();
      if (res.error) throw res.error;
      results.push({ participant: res.data, memberId: memberIds[i], token: token });
    }
    return results;
  },

  // 식사 수정 시: 빠진 사람 삭제, 새로 추가된 사람만 토큰 발급(기존 참여자 링크는 유지).
  async syncParticipants(mealId, memberIds) {
    var existing = await sb.from('meal_participants_vc2608').select('id, member_id').eq('meal_id', mealId);
    if (existing.error) throw existing.error;
    var existingIds = existing.data.map(function (r) { return r.member_id; });
    var toAdd = memberIds.filter(function (id) { return existingIds.indexOf(id) === -1; });
    var toRemove = existing.data.filter(function (r) { return memberIds.indexOf(r.member_id) === -1; });
    if (toRemove.length) {
      var del = await sb.from('meal_participants_vc2608').delete().in('id', toRemove.map(function (r) { return r.id; }));
      if (del.error) throw del.error;
    }
    if (toAdd.length) return API.mealParticipants.bulkCreateWithTokens(mealId, toAdd);
    return [];
  },

  // 3-1/3-3에서 쓰는 "이 식사에 누가 뭐라고 답했는지" 명단(가족 구성원 이름 + 응답 조인)
  async getRoster(mealId) {
    var res = await sb.from('meal_participants_vc2608')
      .select('id, member_id, response_token_hash, household_members_vc2608(id, name, avatar_url, color)')
      .eq('meal_id', mealId);
    if (res.error) throw res.error;
    var responses = await sb.from('meal_responses_vc2608').select('*').eq('meal_id', mealId);
    if (responses.error) throw responses.error;
    var byMember = {};
    responses.data.forEach(function (r) { if (r.member_id) byMember[r.member_id] = r; });
    return res.data.map(function (p) {
      var member = p.household_members_vc2608;
      var response = byMember[p.member_id];
      return {
        participantId: p.id, memberId: p.member_id,
        name: member ? member.name : '(알 수 없음)',
        avatarUrl: member ? member.avatar_url : null,
        color: member ? member.color : null,
        status: response ? response.status : 'pending',
        arrivalTime: response ? response.arrival_time : null,
        note: response ? response.note : null
      };
    });
  },

  // 이전 링크를 잃어버렸을 때(원본 토큰은 해시로만 저장돼서 복구 불가) 새 링크 발급 — 기존 링크는 무효화됨.
  async regenerateToken(participantId) {
    var token = crypto.randomUUID();
    var tokenHash = await sha256Hex(token);
    var res = await sb.from('meal_participants_vc2608').update({ response_token_hash: tokenHash }).eq('id', participantId);
    if (res.error) throw res.error;
    return token;
  },

  // 1인1링크로 들어온 사람이 자기 정보를 볼 때(로그인 불필요)
  async getByToken(tokenHash) {
    var res = await sb.rpc('get_participant_by_token_vc2608', { p_token_hash: tokenHash });
    if (res.error) throw res.error;
    return res.data && res.data[0];
  },

  async respondByToken(tokenHash, status, arrivalTime, note) {
    var res = await sb.rpc('respond_via_participant_token_vc2608', {
      p_token_hash: tokenHash, p_status: status, p_arrival_time: arrivalTime || null, p_note: note || null
    });
    if (res.error) throw res.error;
    return res.data;
  }
};

// 로그인한 본인이 3-1 카드에서 바로 탭 한 번으로 응답할 때(1인1링크 없이, 세션 기반으로).
API.mealResponses = {
  async respondSelf(mealId, memberId, status, arrivalTime, note) {
    var res = await sb.from('meal_responses_vc2608')
      .upsert({ meal_id: mealId, member_id: memberId, is_guest: false, status: status, arrival_time: arrivalTime || null, note: note || null, updated_at: new Date().toISOString() },
              { onConflict: 'meal_id,member_id' });
    if (res.error) throw res.error;
  }
};

// 손님용 범용 공유 링크(가구에 등록되지 않은, 정말 처음 오는 사람) — meal_share_links_vc2608
API.mealShareLinks = {
  async create(mealId) {
    var session = await getSession();
    var token = crypto.randomUUID();
    var tokenHash = await sha256Hex(token);
    var res = await sb.from('meal_share_links_vc2608').insert({
      meal_id: mealId, token_hash: tokenHash, created_by: session.user.id
    }).select().single();
    if (res.error) throw res.error;
    return { link: res.data, token: token };
  },

  async getMealByToken(tokenHash) {
    var res = await sb.rpc('get_meal_by_share_token_vc2608', { share_token_hash: tokenHash });
    if (res.error) throw res.error;
    return res.data && res.data[0];
  },

  async submitGuestResponse(tokenHash, guestToken, guestName, status, arrivalTime) {
    var res = await sb.rpc('submit_guest_meal_response_vc2608', {
      share_token_hash: tokenHash, guest_token_value: guestToken,
      guest_display_name: guestName, response_status: status, response_arrival_time: arrivalTime || null
    });
    if (res.error) throw res.error;
    return res.data;
  },

  async getGuestResponse(tokenHash, guestToken) {
    var res = await sb.rpc('get_guest_response_vc2608', { share_token_hash: tokenHash, guest_token_value: guestToken });
    if (res.error) throw res.error;
    return res.data;
  }
};

// ---------------------------------------------------------
// 반복 일정 / 요일별 기본응답 / 날짜별 미리답변
// ---------------------------------------------------------
API.recurringMeals = {
  async list(householdId) {
    var res = await sb.from('recurring_meals_vc2608').select('*').eq('household_id', householdId);
    if (res.error) throw res.error;
    return res.data;
  },
  async add(householdId, fields) {
    var res = await sb.from('recurring_meals_vc2608').insert({
      household_id: householdId, days: fields.days, time: fields.time,
      kind: fields.kind, menu: fields.menu, participant_member_ids: fields.participantMemberIds
    }).select().single();
    if (res.error) throw res.error;
    return res.data;
  },
  async remove(ruleId) {
    var res = await sb.from('recurring_meals_vc2608').delete().eq('id', ruleId);
    if (res.error) throw res.error;
  },
  async markFired(ruleId, dateStr) {
    var res = await sb.from('recurring_meals_vc2608').update({ last_fired_date: dateStr }).eq('id', ruleId);
    if (res.error) throw res.error;
  }
};

API.weekdayDefaults = {
  async list(householdId) {
    var res = await sb.from('weekday_defaults_vc2608').select('*').eq('household_id', householdId);
    if (res.error) throw res.error;
    return res.data;
  },
  async upsert(householdId, memberId, dayIndex, status) {
    var res = await sb.from('weekday_defaults_vc2608')
      .upsert({ household_id: householdId, member_id: memberId, day_index: dayIndex, status: status },
              { onConflict: 'member_id,day_index' });
    if (res.error) throw res.error;
  },
  // '미정'으로 되돌리기 — 행 자체가 없으면 미정이므로 삭제로 표현.
  async remove(memberId, dayIndex) {
    var res = await sb.from('weekday_defaults_vc2608').delete().eq('member_id', memberId).eq('day_index', dayIndex);
    if (res.error) throw res.error;
  }
};

API.advanceAnswers = {
  async list(householdId) {
    var res = await sb.from('advance_answers_vc2608').select('*').eq('household_id', householdId);
    if (res.error) throw res.error;
    return res.data;
  },
  async upsert(householdId, memberId, date, status) {
    var res = await sb.from('advance_answers_vc2608')
      .upsert({ household_id: householdId, member_id: memberId, date: date, status: status },
              { onConflict: 'member_id,date' });
    if (res.error) throw res.error;
  }
};

// ---------------------------------------------------------
// 메뉴 투표 / 메뉴 요청 / 저장된 장소
// ---------------------------------------------------------
API.menuPoll = {
  // household당 활성 투표 1개가 원칙이지만 DB엔 이를 강제하는 유니크 제약이 없어(레이스 등으로
  // 2개가 생기면) .maybeSingle()이 에러를 던져 홈 화면 전체가 멈추는 걸 막기 위해 최신 것 하나만 반환.
  async get(householdId) {
    var res = await sb.from('menu_poll_vc2608').select('*').eq('household_id', householdId)
      .order('created_at', { ascending: false }).limit(1);
    if (res.error) throw res.error;
    return res.data && res.data[0] ? res.data[0] : null;
  },
  async start(householdId, options) {
    var res = await sb.from('menu_poll_vc2608').insert({ household_id: householdId, options: options, votes: {} }).select().single();
    if (res.error) throw res.error;
    return res.data;
  },
  async vote(pollId, memberId, option) {
    var poll = await sb.from('menu_poll_vc2608').select('votes').eq('id', pollId).single();
    if (poll.error) throw poll.error;
    var votes = poll.data.votes || {};
    votes[memberId] = option;
    var res = await sb.from('menu_poll_vc2608').update({ votes: votes }).eq('id', pollId);
    if (res.error) throw res.error;
  },
  async cancel(pollId) {
    var res = await sb.from('menu_poll_vc2608').delete().eq('id', pollId);
    if (res.error) throw res.error;
  }
};

API.menuRequests = {
  async list(householdId) {
    var res = await sb.from('menu_requests_vc2608').select('*, household_members_vc2608(name)').eq('household_id', householdId).order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return res.data;
  },
  async add(householdId, memberId, menu) {
    var res = await sb.from('menu_requests_vc2608').insert({ household_id: householdId, member_id: memberId, menu: menu }).select().single();
    if (res.error) throw res.error;
    return res.data;
  },
  async remove(id) {
    var res = await sb.from('menu_requests_vc2608').delete().eq('id', id);
    if (res.error) throw res.error;
  }
};

API.savedPlaces = {
  async list(householdId) {
    var res = await sb.from('saved_places_vc2608').select('*').eq('household_id', householdId).order('name');
    if (res.error) throw res.error;
    return res.data;
  },
  async add(householdId, name) {
    var existing = await sb.from('saved_places_vc2608').select('id').eq('household_id', householdId).eq('name', name).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return existing.data;
    var ins = await sb.from('saved_places_vc2608').insert({ household_id: householdId, name: name }).select().single();
    if (ins.error) throw ins.error;
    return ins.data;
  }
};

// ---------------------------------------------------------
// 방명록 / 오늘 안 본 사람
// ---------------------------------------------------------
API.guestbook = {
  async list(householdId) {
    var res = await sb.from('guestbook_notes_vc2608').select('*, household_members_vc2608(name)').eq('household_id', householdId).order('created_at');
    if (res.error) throw res.error;
    return res.data;
  },
  async add(householdId, memberId, message, day) {
    var res = await sb.from('guestbook_notes_vc2608').insert({ household_id: householdId, member_id: memberId, message: message, day: day }).select().single();
    if (res.error) throw res.error;
    return res.data;
  },
  async remove(id) {
    var res = await sb.from('guestbook_notes_vc2608').delete().eq('id', id);
    if (res.error) throw res.error;
  }
};

// ---------------------------------------------------------
// 밀키트 주문(제휴사 연동 자체는 범위 밖 — "주문 시도" 이력만 실제로 남김)
// ---------------------------------------------------------
API.milkitOrders = {
  async create(householdId, mealId, recipeName, missingIngredients) {
    var res = await sb.from('milkit_orders_vc2608').insert({
      household_id: householdId, meal_id: mealId || null, recipe_name: recipeName,
      missing_ingredients: missingIngredients || [], status: 'suggested'
    }).select().single();
    if (res.error) throw res.error;
    return res.data;
  },
  async markOrdered(orderId) {
    var res = await sb.from('milkit_orders_vc2608').update({ status: 'ordered_stub' }).eq('id', orderId);
    if (res.error) throw res.error;
  },
  async listByHousehold(householdId) {
    var res = await sb.from('milkit_orders_vc2608').select('*').eq('household_id', householdId).order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return res.data;
  }
};

API.lastSeen = {
  async list(householdId) {
    var res = await sb.from('last_seen_vc2608').select('*').eq('household_id', householdId);
    if (res.error) throw res.error;
    return res.data;
  },
  async touch(householdId, memberId, dateStr) {
    var res = await sb.from('last_seen_vc2608')
      .upsert({ household_id: householdId, member_id: memberId, last_seen_date: dateStr }, { onConflict: 'household_id,member_id' });
    if (res.error) throw res.error;
  }
};

// ---------------------------------------------------------
// 알림
// ---------------------------------------------------------
API.notifications = {
  async listForMember(memberId) {
    var res = await sb.from('notifications_vc2608').select('*').eq('member_id', memberId).order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return res.data;
  },
  async create(householdId, memberId, mealId, text, detail) {
    var res = await sb.from('notifications_vc2608').insert({
      household_id: householdId, member_id: memberId, meal_id: mealId || null, text: text, detail: detail || null, read: false
    });
    if (res.error) throw res.error;
  },
  async markRead(id) {
    var res = await sb.from('notifications_vc2608').update({ read: true }).eq('id', id);
    if (res.error) throw res.error;
  }
};

// ---------------------------------------------------------
// 밀키트 주문(제안 이력만)
// ---------------------------------------------------------
API.milkitOrders = {
  async create(householdId, mealId, recipeName, missingIngredients) {
    var res = await sb.from('milkit_orders_vc2608').insert({
      household_id: householdId, meal_id: mealId || null, recipe_name: recipeName, missing_ingredients: missingIngredients || []
    }).select().single();
    if (res.error) throw res.error;
    return res.data;
  },
  async markOrderedStub(id) {
    var res = await sb.from('milkit_orders_vc2608').update({ status: 'ordered_stub' }).eq('id', id);
    if (res.error) throw res.error;
  }
};

// ---------------------------------------------------------
// 실시간 구독 공통 헬퍼
// ---------------------------------------------------------
// household_id 컬럼이 없는 테이블(meal_responses_vc2608 등)은 필터 없이 구독 —
// RLS가 어차피 내 가구 행만 보내주므로 안전하고, household_id 있는 건 필터로 노이즈만 줄임.
var HOUSEHOLD_SCOPED_TABLES = ['meals_vc2608', 'notifications_vc2608', 'guestbook_notes_vc2608', 'advance_answers_vc2608', 'menu_poll_vc2608'];

API.realtime = {
  // tables: ['meals_vc2608', 'meal_responses_vc2608', ...], onChange(payload)
  subscribeToHousehold(householdId, tables, onChange) {
    var channel = sb.channel('household-' + householdId);
    tables.forEach(function (table) {
      var config = { event: '*', schema: 'public', table: table };
      if (HOUSEHOLD_SCOPED_TABLES.indexOf(table) !== -1) config.filter = 'household_id=eq.' + householdId;
      channel.on('postgres_changes', config, onChange);
    });
    channel.subscribe();
    return channel;
  },
  unsubscribe(channel) {
    if (channel) sb.removeChannel(channel);
  }
};
