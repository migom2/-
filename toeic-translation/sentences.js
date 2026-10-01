// 번역 문제 데이터
// en: 영어 문장, ko: 모범 번역
// keys: 자동 체크용 핵심 의미 (각 묶음 중 하나라도 답에 있으면 통과)
// exprs: [표현, 뜻, 설명], words: [영단어, 뜻]
const LEVELS = [400, 500, 600, 700, 800, 900];

const SENTENCES = [
  // ───────── 400 ─────────
  {
    id: '400-01', level: 400,
    en: 'Please submit your report by Friday.',
    ko: '금요일까지 보고서를 제출해 주세요.',
    keys: [['금요일'], ['보고서', '리포트'], ['제출', '내']],
    exprs: [
      ['Please + 동사원형', '~해 주세요', '명령문 앞에 Please를 붙이면 정중한 요청이 됩니다.'],
      ['by Friday', '금요일까지', 'by는 그때까지 "완료"되어야 하는 기한, until은 그때까지 "계속"되는 상태에 씁니다.'],
    ],
    words: [['submit', '제출하다'], ['report', '보고서']],
  },
  {
    id: '400-02', level: 400,
    en: 'The meeting will start at 10 a.m. in Room B.',
    ko: '회의는 오전 10시에 B 회의실에서 시작합니다.',
    keys: [['회의', '미팅'], ['10시', '열시', '열 시'], ['시작']],
    exprs: [
      ['at 10 a.m.', '오전 10시에', '정확한 시각 앞에는 at을 씁니다. (at noon, at 3 p.m.)'],
      ['in Room B', 'B실에서', '방·건물 안이라는 공간 개념이면 in을 씁니다.'],
    ],
    words: [['meeting', '회의'], ['start', '시작하다']],
  },
  {
    id: '400-03', level: 400,
    en: 'Our store is closed on Sundays.',
    ko: '저희 가게는 매주 일요일에 문을 닫습니다.',
    keys: [['가게', '매장', '상점', '점포'], ['일요일'], ['닫', '휴무', '쉽', '쉬', '영업하지']],
    exprs: [
      ['on Sundays', '매주 일요일에', '요일을 복수형으로 쓰면 "일요일마다"라는 반복의 의미가 됩니다.'],
      ['be closed', '문을 닫다, 휴업하다', 'closed는 형용사로 "영업하지 않는" 상태를 나타냅니다.'],
    ],
    words: [['store', '가게, 매장'], ['closed', '문을 닫은, 휴업한']],
  },
  {
    id: '400-04', level: 400,
    en: 'Could you send me the price list?',
    ko: '가격표를 저에게 보내 주시겠어요?',
    keys: [['가격', '단가'], ['보내', '전송', '발송']],
    exprs: [
      ['Could you ~?', '~해 주시겠어요?', 'Can you보다 더 정중한 요청 표현입니다.'],
      ['send A B', 'A에게 B를 보내다', 'send me the list = send the list to me'],
    ],
    words: [['price list', '가격표'], ['send', '보내다']],
  },
  {
    id: '400-05', level: 400,
    en: 'The new printer is on the second floor.',
    ko: '새 프린터는 2층에 있습니다.',
    keys: [['프린터', '인쇄기'], ['2층', '이층', '2 층']],
    exprs: [
      ['on the second floor', '2층에', '층 앞에는 on을 씁니다. 서수(second, third)를 사용하는 것에 주의하세요.'],
    ],
    words: [['printer', '프린터'], ['floor', '층, 바닥']],
  },
  {
    id: '400-06', level: 400,
    en: 'Mr. Kim is out of the office today.',
    ko: '김 씨는 오늘 사무실에 안 계십니다.',
    keys: [['김'], ['오늘'], ['사무실', '외근', '자리', '부재', '출장', '회사']],
    exprs: [
      ['out of the office', '부재중인, 외근 중인', '자동응답 메일에서 자주 보는 표현입니다. (out-of-office reply = 부재중 자동 회신)'],
    ],
    words: [['office', '사무실'], ['out of the office', '부재중인']],
  },
  {
    id: '400-07', level: 400,
    en: 'Tickets are available at the front desk.',
    ko: '표는 안내 데스크에서 구하실 수 있습니다.',
    keys: [['표', '티켓', '입장권'], ['데스크', '안내', '프런트', '프론트', '접수']],
    exprs: [
      ['be available', '구할 수 있다, 이용할 수 있다', '사물에는 "이용 가능한", 사람에게는 "시간이 되는"이라는 뜻으로 쓰입니다. 토익 최빈출 단어!'],
    ],
    words: [['ticket', '표, 입장권'], ['available', '이용 가능한, 구할 수 있는'], ['front desk', '안내 데스크, 프런트']],
  },
  {
    id: '400-08', level: 400,
    en: 'I would like to make a reservation for two people.',
    ko: '두 사람 예약을 하고 싶습니다.',
    keys: [['예약'], ['두', '2', '둘'], ['싶', '원합']],
    exprs: [
      ['would like to + 동사원형', '~하고 싶다', 'want to의 정중한 표현입니다.'],
      ['make a reservation', '예약하다', '= book. 식당·호텔·항공 지문에 자주 나옵니다.'],
    ],
    words: [['reservation', '예약'], ['would like to', '~하고 싶다']],
  },
  {
    id: '400-09', level: 400,
    en: 'The bus to the airport leaves every 30 minutes.',
    ko: '공항행 버스는 30분마다 출발합니다.',
    keys: [['공항'], ['30분', '삼십 분', '삼십분'], ['출발', '떠', '다닙', '운행', '있']],
    exprs: [
      ['the bus to ~', '~행 버스', 'to는 목적지를 나타냅니다.'],
      ['every 30 minutes', '30분마다', 'every + 숫자 + 복수명사 = ~마다'],
    ],
    words: [['airport', '공항'], ['leave', '떠나다, 출발하다']],
  },
  {
    id: '400-10', level: 400,
    en: 'Please call me if you have any questions.',
    ko: '질문이 있으시면 저에게 전화해 주세요.',
    keys: [['질문', '문의', '궁금'], ['전화', '연락']],
    exprs: [
      ['if you have any questions', '질문이 있으시면', '이메일·안내문 마지막에 거의 항상 나오는 문장입니다. 조건문에서는 some 대신 any를 씁니다.'],
    ],
    words: [['question', '질문'], ['call', '전화하다']],
  },

  // ───────── 500 ─────────
  {
    id: '500-01', level: 500,
    en: 'All employees must attend the safety training next Monday.',
    ko: '모든 직원은 다음 주 월요일 안전 교육에 참석해야 합니다.',
    keys: [['직원', '사원'], ['안전'], ['교육', '훈련', '연수'], ['참석', '참가', '들어야', '받아야'], ['월요일']],
    exprs: [
      ['must + 동사원형', '~해야 한다', '규칙·의무를 나타냅니다.'],
      ['attend', '~에 참석하다', '타동사라서 전치사 없이 바로 목적어가 옵니다. attend to the meeting (X)'],
    ],
    words: [['employee', '직원'], ['attend', '참석하다'], ['safety', '안전'], ['training', '교육, 연수']],
  },
  {
    id: '500-02', level: 500,
    en: 'The package was delivered to the wrong address.',
    ko: '소포가 잘못된 주소로 배달되었습니다.',
    keys: [['소포', '택배', '물건', '짐', '패키지'], ['잘못', '틀린', '다른', '엉뚱'], ['주소'], ['배달', '배송', '보내']],
    exprs: [
      ['was delivered', '배달되었다', 'be + p.p. 수동태. 주어(소포)가 행동을 "당하는" 입장입니다.'],
      ['the wrong address', '잘못된 주소', 'wrong은 "틀린, 엉뚱한"이라는 의미로 명사 앞에서 the와 함께 자주 쓰입니다.'],
    ],
    words: [['package', '소포'], ['deliver', '배달하다'], ['address', '주소']],
  },
  {
    id: '500-03', level: 500,
    en: 'We are looking for an experienced sales manager.',
    ko: '저희는 경력 있는 영업 관리자를 찾고 있습니다.',
    keys: [['경력', '경험', '숙련', '노련'], ['영업', '판매', '세일즈'], ['찾', '구합', '구하', '모집', '채용']],
    exprs: [
      ['look for', '~을 찾다', '구인 광고의 단골 표현입니다. (= seek)'],
      ['experienced', '경력 있는, 숙련된', '-ed 형용사로 "경험을 쌓은" 상태를 나타냅니다.'],
    ],
    words: [['look for', '~을 찾다'], ['experienced', '경력 있는, 숙련된'], ['sales manager', '영업 관리자']],
  },
  {
    id: '500-04', level: 500,
    en: 'The restaurant offers a 10 percent discount to students.',
    ko: '그 식당은 학생들에게 10퍼센트 할인을 제공합니다.',
    keys: [['식당', '레스토랑', '음식점'], ['10', '십'], ['할인'], ['학생']],
    exprs: [
      ['offer A to B', 'B에게 A를 제공하다', '= offer B A. 4형식으로도 쓸 수 있습니다.'],
      ['a 10 percent discount', '10퍼센트 할인', '숫자-명사가 형용사처럼 쓰일 때는 단수형(percent)을 씁니다.'],
    ],
    words: [['offer', '제공하다'], ['discount', '할인']],
  },
  {
    id: '500-05', level: 500,
    en: 'Please fill out this form and return it to the reception desk.',
    ko: '이 양식을 작성해서 접수처에 제출해 주세요.',
    keys: [['양식', '서식', '신청서', '서류', '용지'], ['작성', '기입', '채워', '적어'], ['접수', '안내', '리셉션', '프런트', '프론트'], ['제출', '돌려', '반납', '내', '가져']],
    exprs: [
      ['fill out', '(서류를) 작성하다', '= fill in, complete. 토익 빈출 구동사입니다.'],
      ['return A to B', 'A를 B에 돌려주다/제출하다', 'return은 "돌아가다" 외에 "돌려주다, 반납하다"로도 많이 쓰입니다.'],
    ],
    words: [['fill out', '작성하다'], ['form', '양식, 서식'], ['return', '돌려주다, 반납하다'], ['reception desk', '접수처']],
  },
  {
    id: '500-06', level: 500,
    en: 'The flight has been canceled due to bad weather.',
    ko: '악천후로 인해 항공편이 취소되었습니다.',
    keys: [['항공', '비행', '편'], ['취소', '결항'], ['날씨', '기상', '악천후']],
    exprs: [
      ['has been canceled', '취소되었다', '현재완료 수동태(have been p.p.). 취소된 결과가 지금까지 이어집니다.'],
      ['due to + 명사', '~때문에', '= because of, owing to. 뒤에 절(주어+동사)이 아닌 명사가 옵니다.'],
    ],
    words: [['flight', '항공편'], ['cancel', '취소하다'], ['due to', '~때문에'], ['weather', '날씨']],
  },
  {
    id: '500-07', level: 500,
    en: 'Our sales increased by 15 percent last quarter.',
    ko: '지난 분기에 우리 매출이 15퍼센트 증가했습니다.',
    keys: [['매출', '판매'], ['15', '십오'], ['분기'], ['증가', '늘', '올', '상승', '성장']],
    exprs: [
      ['increase by 15 percent', '15퍼센트 증가하다', 'by는 "차이·변화량"을 나타냅니다. increase to는 "~까지 증가하다".'],
      ['last quarter', '지난 분기', '1년을 4개로 나눈 3개월 단위. 실적 발표 지문에 자주 나옵니다.'],
    ],
    words: [['sales', '매출, 판매량'], ['increase', '증가하다'], ['quarter', '분기']],
  },
  {
    id: '500-08', level: 500,
    en: 'The manager asked me to review the contract before Thursday.',
    ko: '매니저가 저에게 목요일 전에 계약서를 검토해 달라고 요청했습니다.',
    keys: [['매니저', '관리자', '부장', '팀장', '과장', '상사', '책임자'], ['계약'], ['검토', '확인', '살펴', '읽어'], ['목요일'], ['요청', '부탁', '달라', '했']],
    exprs: [
      ['ask A to + 동사원형', 'A에게 ~해 달라고 요청하다', '목적어 뒤에 to부정사가 오는 5형식 동사입니다. (tell, want, allow도 같은 구조)'],
    ],
    words: [['review', '검토하다'], ['contract', '계약(서)'], ['manager', '관리자, 매니저']],
  },
  {
    id: '500-09', level: 500,
    en: 'Parking is free for hotel guests.',
    ko: '호텔 투숙객은 주차가 무료입니다.',
    keys: [['주차'], ['무료', '공짜', '돈을 내지'], ['투숙', '손님', '고객', '숙박', '이용객']],
    exprs: [
      ['free for ~', '~에게 무료인', 'free는 "자유로운" 외에 "무료의"라는 뜻이 토익에서 매우 중요합니다. (free of charge)'],
    ],
    words: [['parking', '주차'], ['free', '무료의'], ['guest', '투숙객, 손님']],
  },
  {
    id: '500-10', level: 500,
    en: 'The museum is open from 9 a.m. to 6 p.m. every day except Monday.',
    ko: '박물관은 월요일을 제외하고 매일 오전 9시부터 오후 6시까지 문을 엽니다.',
    keys: [['박물관'], ['9시', '아홉'], ['6시', '여섯'], ['월요일'], ['제외', '빼', '외']],
    exprs: [
      ['from A to B', 'A부터 B까지', '시간·장소의 범위를 나타냅니다.'],
      ['except + 명사', '~을 제외하고', '= except for, other than'],
    ],
    words: [['museum', '박물관'], ['except', '~을 제외하고']],
  },

  // ───────── 600 ─────────
  {
    id: '600-01', level: 600,
    en: 'The marketing team has decided to postpone the product launch until further notice.',
    ko: '마케팅팀은 추후 공지가 있을 때까지 제품 출시를 연기하기로 결정했습니다.',
    keys: [['마케팅'], ['출시', '발매', '론칭', '런칭', '공개'], ['연기', '미루', '미뤄', '늦추'], ['추후', '추가', '별도', '다음', '나중', '새로운'], ['결정', '정했', '하기로']],
    exprs: [
      ['decide to + 동사원형', '~하기로 결정하다', 'decide 뒤에는 to부정사가 옵니다. (decide -ing X)'],
      ['until further notice', '추후 공지가 있을 때까지', '공지문의 고정 표현. "별도 안내 시까지"라고 번역해도 좋습니다.'],
    ],
    words: [['postpone', '연기하다, 미루다'], ['launch', '출시, 출시하다'], ['notice', '공지, 통지'], ['decide', '결정하다']],
  },
  {
    id: '600-02', level: 600,
    en: 'Applicants should submit their résumés no later than May 31.',
    ko: '지원자들은 늦어도 5월 31일까지 이력서를 제출해야 합니다.',
    keys: [['지원자', '응시자', '신청자'], ['이력서'], ['5월', '오월'], ['31'], ['제출', '내', '보내']],
    exprs: [
      ['no later than ~', '늦어도 ~까지', '마감 기한을 강조하는 표현. by와 비슷하지만 더 공식적입니다.'],
      ['should', '~해야 한다', '안내문에서는 "~하셔야 합니다"로 번역하면 자연스럽습니다.'],
    ],
    words: [['applicant', '지원자'], ['résumé', '이력서'], ['no later than', '늦어도 ~까지']],
  },
  {
    id: '600-03', level: 600,
    en: 'The renovation of the lobby is expected to be completed next month.',
    ko: '로비 보수 공사는 다음 달에 완료될 것으로 예상됩니다.',
    keys: [['로비'], ['보수', '공사', '개조', '리모델링', '수리', '개보수'], ['다음 달', '다음달', '내달'], ['완료', '끝', '마무리', '마칠', '마쳐'], ['예상', '예정', '것으로', '보입', '전망']],
    exprs: [
      ['be expected to + 동사원형', '~할 것으로 예상되다', '뉴스·공지에서 미래 일정을 말할 때 자주 씁니다.'],
      ['be completed', '완료되다', 'to 뒤에 수동태 원형(be p.p.)이 왔습니다.'],
    ],
    words: [['renovation', '보수, 개조'], ['expect', '예상하다'], ['complete', '완료하다']],
  },
  {
    id: '600-04', level: 600,
    en: 'Customers who purchase two items will receive a free gift.',
    ko: '상품을 두 개 구매하는 고객은 무료 사은품을 받게 됩니다.',
    keys: [['고객', '손님', '구매자'], ['두', '2'], ['구매', '구입', '사는', '산'], ['사은품', '선물', '증정', '경품'], ['받', '드립', '제공']],
    exprs: [
      ['Customers who ~', '~하는 고객', '관계대명사 who가 앞의 Customers를 꾸밉니다. 한국어로는 앞에서 수식하도록 옮기세요.'],
      ['free gift', '무료 사은품', '판촉 광고의 단골 표현입니다.'],
    ],
    words: [['purchase', '구매하다'], ['item', '물품, 상품'], ['receive', '받다'], ['free gift', '사은품']],
  },
  {
    id: '600-05', level: 600,
    en: "Mr. Lee is responsible for managing the company's budget.",
    ko: '이 씨는 회사의 예산 관리를 담당하고 있습니다.',
    keys: [['예산'], ['관리'], ['담당', '책임', '맡']],
    exprs: [
      ['be responsible for + 명사/-ing', '~을 담당하다, ~에 책임이 있다', '전치사 for 뒤라서 동명사(managing)가 왔습니다. = be in charge of'],
    ],
    words: [['responsible', '책임이 있는, 담당하는'], ['manage', '관리하다'], ['budget', '예산']],
  },
  {
    id: '600-06', level: 600,
    en: 'Due to high demand, the concert tickets sold out within an hour.',
    ko: '수요가 많아서 콘서트 표가 한 시간 만에 매진되었습니다.',
    keys: [['수요', '인기', '요청', '찾는'], ['콘서트', '공연'], ['매진', '다 팔', '품절', '모두 팔'], ['한 시간', '1시간', '한시간', '1 시간']],
    exprs: [
      ['high demand', '높은 수요', '수요가 "많다"는 high로 표현합니다. (low demand = 낮은 수요)'],
      ['sell out', '매진되다, 다 팔리다', '주어가 표(물건)여도 능동형으로 씁니다.'],
      ['within an hour', '한 시간 이내에', 'within + 기간 = ~ 이내에'],
    ],
    words: [['demand', '수요'], ['sell out', '매진되다'], ['within', '~ 이내에']],
  },
  {
    id: '600-07', level: 600,
    en: 'Please make sure that all the lights are turned off before you leave.',
    ko: '나가시기 전에 모든 조명이 꺼져 있는지 꼭 확인해 주세요.',
    keys: [['조명', '불', '전등', '전기'], ['꺼', '끄', '소등'], ['확인', '반드시', '꼭'], ['전에', '떠나기', '퇴근', '나가기', '나가시기', '떠나시기']],
    exprs: [
      ['make sure (that) ~', '반드시 ~하도록 하다, ~인지 확인하다', '안내문의 필수 표현입니다. = ensure'],
      ['be turned off', '꺼지다', 'turn off(끄다)의 수동태. 반대는 turn on.'],
    ],
    words: [['make sure', '반드시 ~하다, 확인하다'], ['turn off', '끄다'], ['light', '조명, 전등']],
  },
  {
    id: '600-08', level: 600,
    en: 'The shipment arrived two days later than scheduled.',
    ko: '배송품이 예정보다 이틀 늦게 도착했습니다.',
    keys: [['배송', '화물', '선적', '물품', '물건', '택배'], ['이틀', '2일', '두 날'], ['늦', '지연'], ['예정', '일정', '계획'], ['도착', '왔', '들어']],
    exprs: [
      ['later than scheduled', '예정보다 늦게', 'than (it was) scheduled에서 생략된 형태. earlier than expected(예상보다 일찍)도 같은 구조입니다.'],
      ['two days later', '이틀 늦게', '차이(two days)가 비교급 앞에 옵니다.'],
    ],
    words: [['shipment', '배송(품), 선적'], ['scheduled', '예정된'], ['arrive', '도착하다']],
  },
  {
    id: '600-09', level: 600,
    en: 'We are pleased to announce the opening of our new branch in Busan.',
    ko: '부산에 새 지점을 개설하게 되었음을 알려 드리게 되어 기쁩니다.',
    keys: [['기쁘', '기뻐', '기쁜', '기쁨', '기쁩'], ['알려', '알리', '발표', '공지', '안내'], ['지점', '지사', '매장'], ['부산'], ['개설', '개점', '오픈', '열', '개업']],
    exprs: [
      ['be pleased to + 동사원형', '~하게 되어 기쁘다', '공식 발표문을 시작할 때 쓰는 정형 표현입니다.'],
      ['announce', '발표하다, 알리다', '명사형 announcement(발표, 공지)도 함께 외우세요.'],
    ],
    words: [['be pleased to', '~하게 되어 기쁘다'], ['announce', '발표하다, 알리다'], ['branch', '지점, 지사']],
  },
  {
    id: '600-10', level: 600,
    en: 'The survey results will be shared with all department heads.',
    ko: '설문 조사 결과는 모든 부서장과 공유될 것입니다.',
    keys: [['설문', '조사'], ['결과'], ['부서장', '부장', '부서 책임자', '팀장', '부서 대표'], ['공유', '전달', '알려']],
    exprs: [
      ['share A with B', 'A를 B와 공유하다', '수동태가 되면 "A is shared with B"가 됩니다.'],
      ['department head', '부서장', 'head는 "우두머리, 책임자"라는 뜻으로도 쓰입니다.'],
    ],
    words: [['survey', '설문 조사'], ['result', '결과'], ['share', '공유하다'], ['department head', '부서장']],
  },

  // ───────── 700 ─────────
  {
    id: '700-01', level: 700,
    en: 'Employees are encouraged to carpool in order to reduce traffic congestion.',
    ko: '직원들은 교통 혼잡을 줄이기 위해 카풀을 하도록 권장됩니다.',
    keys: [['직원'], ['권장', '장려', '권고', '하도록', '권합', '바랍'], ['카풀', '함께 타', '합승', '차량 공유', '같이 타'], ['혼잡', '체증', '정체', '막히'], ['줄이', '감소', '완화', '줄여']],
    exprs: [
      ['be encouraged to + 동사원형', '~하도록 권장되다', '공지문에서 "~해 주시기 바랍니다"처럼 부드러운 권유로 자주 씁니다.'],
      ['in order to + 동사원형', '~하기 위해서', '목적을 분명히 나타내는 표현. = so as to'],
    ],
    words: [['encourage', '장려하다, 권장하다'], ['carpool', '카풀하다, 승용차 함께 타기'], ['reduce', '줄이다'], ['congestion', '혼잡, 정체']],
  },
  {
    id: '700-02', level: 700,
    en: 'Unless otherwise stated, all prices include tax.',
    ko: '별도로 명시되지 않는 한, 모든 가격에는 세금이 포함되어 있습니다.',
    keys: [['별도', '달리', '따로', '다른', '특별'], ['명시', '표기', '언급', '표시', '기재', '안내'], ['가격', '금액', '요금'], ['세금', '부가세', '세'], ['포함']],
    exprs: [
      ['unless ~', '~하지 않는 한', '= if ~ not. 부정의 조건을 나타냅니다.'],
      ['unless otherwise stated', '별도 명시가 없는 한', 'unless (it is) otherwise stated에서 주어+be동사가 생략된 고정 표현입니다. (= unless otherwise noted/specified)'],
    ],
    words: [['unless', '~하지 않는 한'], ['otherwise', '달리, 그렇지 않으면'], ['state', '명시하다, 진술하다'], ['include', '포함하다']],
  },
  {
    id: '700-03', level: 700,
    en: 'The CEO will address the shareholders at the annual meeting.',
    ko: '최고경영자가 연례 회의에서 주주들에게 연설할 것입니다.',
    keys: [['CEO', 'ceo', '대표', '최고경영자', '최고 경영자', '사장', '회장'], ['주주'], ['연례', '연차', '정기', '매년', '연간', '연례'], ['연설', '발표', '말', '인사', '연설']],
    exprs: [
      ['address', '연설하다, (문제를) 다루다', '"주소"만 생각하면 오역하기 쉬운 다의어! address the issue = 문제를 다루다.'],
      ['annual meeting', '연례 회의, 연차 총회', 'annual = 매년의. annually(매년)도 함께 외우세요.'],
    ],
    words: [['address', '연설하다, (문제를) 다루다'], ['shareholder', '주주'], ['annual', '연례의, 매년의']],
  },
  {
    id: '700-04', level: 700,
    en: 'The new software will enable staff to process orders more efficiently.',
    ko: '새 소프트웨어 덕분에 직원들은 주문을 더 효율적으로 처리할 수 있을 것입니다.',
    keys: [['소프트웨어', '프로그램'], ['직원'], ['주문'], ['처리'], ['효율']],
    exprs: [
      ['enable A to + 동사원형', 'A가 ~할 수 있게 하다', '무생물 주어 문장은 "~ 덕분에 A가 ~할 수 있다"로 옮기면 자연스럽습니다.'],
      ['process', '처리하다', '명사 "과정" 외에 동사 "처리하다"로 토익에 자주 나옵니다.'],
    ],
    words: [['enable', '가능하게 하다'], ['staff', '직원'], ['process', '처리하다'], ['efficiently', '효율적으로']],
  },
  {
    id: '700-05', level: 700,
    en: 'Interested candidates should contact the human resources department for further details.',
    ko: '관심 있는 지원자는 자세한 사항을 위해 인사부에 연락하시기 바랍니다.',
    keys: [['관심'], ['지원자', '후보', '응시자'], ['인사'], ['연락', '문의'], ['자세', '세부', '상세', '추가', '더 많은']],
    exprs: [
      ['interested candidates', '관심 있는 지원자', '구인 광고 마지막 문장의 단골 표현입니다.'],
      ['contact', '~에게 연락하다', 'attend처럼 전치사 없이 목적어가 바로 옵니다. contact to (X)'],
      ['for further details', '자세한 사항은', '= for more information'],
    ],
    words: [['candidate', '지원자, 후보자'], ['contact', '연락하다'], ['human resources', '인사부'], ['further', '추가의, 더 이상의'], ['details', '세부 사항']],
  },
  {
    id: '700-06', level: 700,
    en: 'Despite the economic downturn, the company managed to increase its profits.',
    ko: '경기 침체에도 불구하고 그 회사는 수익을 늘릴 수 있었습니다.',
    keys: [['불구', '에도'], ['경기', '경제'], ['침체', '불황', '하락', '악화'], ['수익', '이익', '이윤'], ['늘', '증가', '올', '증대', '높']],
    exprs: [
      ['despite + 명사', '~에도 불구하고', '= in spite of. although 뒤에는 절, despite 뒤에는 명사가 옵니다. (토익 Part 5 빈출)'],
      ['manage to + 동사원형', '(어려움 속에서) 용케 ~해내다', '"관리하다"가 아니라 "해내다"라는 의미입니다.'],
    ],
    words: [['despite', '~에도 불구하고'], ['downturn', '(경기) 침체'], ['manage to', '용케 ~해내다'], ['profit', '이익, 수익']],
  },
  {
    id: '700-07', level: 700,
    en: 'The warranty does not cover damage caused by improper use.',
    ko: '부적절한 사용으로 인한 손상은 품질 보증 대상이 아닙니다.',
    keys: [['보증', '워런티', '개런티', 'AS', 'A/S'], ['부적절', '잘못', '부주의', '올바르지', '부당'], ['사용'], ['손상', '파손', '피해', '고장'], ['보장', '적용', '포함', '보상', '해당', '대상', '않']],
    exprs: [
      ['cover', '보장하다, 포함하다', '보험·보증서 문맥에서 "(비용·손해를) 보장하다"라는 뜻입니다.'],
      ['damage caused by ~', '~로 인한 손상', '과거분사 caused가 damage를 뒤에서 꾸밉니다.'],
    ],
    words: [['warranty', '품질 보증(서)'], ['cover', '보장하다, 포함하다'], ['damage', '손상, 피해'], ['improper', '부적절한']],
  },
  {
    id: '700-08', level: 700,
    en: 'Ms. Park has been promoted to regional sales director.',
    ko: '박 씨는 지역 영업 이사로 승진했습니다.',
    keys: [['박'], ['승진'], ['지역'], ['영업', '판매'], ['이사', '책임자', '부장', '디렉터', '본부장', '임원']],
    exprs: [
      ['be promoted to ~', '~로 승진하다', '승진은 "시켜지는" 것이라 수동태로 씁니다.'],
    ],
    words: [['promote', '승진시키다, 홍보하다'], ['regional', '지역의'], ['director', '이사, 책임자']],
  },
  {
    id: '700-09', level: 700,
    en: 'Our goal is to expand into overseas markets within the next five years.',
    ko: '우리의 목표는 향후 5년 안에 해외 시장으로 진출하는 것입니다.',
    keys: [['목표'], ['해외', '외국', '국외', '글로벌'], ['시장'], ['5년', '오년', '5 년', '다섯'], ['진출', '확장', '확대', '넓히']],
    exprs: [
      ['Our goal is to ~', '우리의 목표는 ~하는 것이다', 'to부정사가 보어로 쓰였습니다.'],
      ['expand into ~', '~로 진출하다, 확장하다', '사업 영역을 넓힐 때 쓰는 표현입니다.'],
    ],
    words: [['goal', '목표'], ['expand', '확장하다'], ['overseas', '해외의, 해외로']],
  },
  {
    id: '700-10', level: 700,
    en: 'Attendance at the workshop is mandatory for all new hires.',
    ko: '모든 신입 사원은 워크숍에 의무적으로 참석해야 합니다.',
    keys: [['참석', '출석', '참가'], ['워크숍', '워크샵', '연수'], ['의무', '필수', '반드시', '꼭'], ['신입', '새로 채용', '신규', '새로 입사', '새 직원', '새로운 직원']],
    exprs: [
      ['attendance at ~', '~에의 참석', '명사형 attendance 뒤에는 at이 옵니다.'],
      ['mandatory', '의무적인', '= compulsory, required. 반대말은 optional(선택적인).'],
      ['new hire', '신입 사원', 'hire는 동사 "고용하다" 외에 명사 "고용된 사람"으로도 쓰입니다.'],
    ],
    words: [['attendance', '참석, 출석'], ['mandatory', '의무적인'], ['new hire', '신입 사원']],
  },

  // ───────── 800 ─────────
  {
    id: '800-01', level: 800,
    en: 'The merger is subject to approval by government regulators.',
    ko: '그 합병은 정부 규제 당국의 승인을 받아야 합니다.',
    keys: [['합병'], ['정부'], ['규제', '감독', '당국'], ['승인', '허가'], ['받아야', '필요', '달려', '조건', '대상']],
    exprs: [
      ['be subject to + 명사', '~을 받아야 한다, ~의 대상이다', '계약서·공지의 핵심 표현. Prices are subject to change. = 가격은 변동될 수 있습니다.'],
    ],
    words: [['merger', '합병'], ['be subject to', '~의 대상이다, ~을 받아야 하다'], ['approval', '승인'], ['regulator', '규제 기관']],
  },
  {
    id: '800-02', level: 800,
    en: 'Should you have any questions regarding your invoice, please do not hesitate to contact us.',
    ko: '청구서와 관련하여 문의 사항이 있으시면 언제든지 연락 주십시오.',
    keys: [['청구서', '송장', '인보이스', '청구', '계산서'], ['질문', '문의', '궁금'], ['주저', '망설', '언제든', '부담', '편하게'], ['연락']],
    exprs: [
      ['Should you ~', '혹시 ~하시면', 'If you should have ~에서 if를 빼고 도치한 가정법. 격식 있는 이메일에 자주 나옵니다.'],
      ['regarding', '~에 관하여', '= concerning, about, with regard to'],
      ['do not hesitate to ~', '주저하지 말고 ~하세요', '"언제든지 ~하세요"로 의역하면 자연스럽습니다.'],
    ],
    words: [['invoice', '청구서, 송장'], ['regarding', '~에 관하여'], ['hesitate', '주저하다, 망설이다']],
  },
  {
    id: '800-03', level: 800,
    en: 'The board approved the proposal on the condition that costs remain within budget.',
    ko: '이사회는 비용이 예산 범위 내에서 유지된다는 조건으로 그 제안을 승인했습니다.',
    keys: [['이사회'], ['승인', '통과', '허가', '받아들'], ['제안', '안건', '계획'], ['조건', '경우에'], ['비용'], ['예산']],
    exprs: [
      ['on the condition that ~', '~라는 조건으로', '= provided that, as long as'],
      ['remain within budget', '예산 내에서 유지되다', 'remain + 형용사/전치사구 = ~한 상태로 남다'],
    ],
    words: [['board', '이사회'], ['approve', '승인하다'], ['proposal', '제안(서)'], ['remain', '여전히 ~이다, 남다'], ['on the condition that', '~라는 조건으로']],
  },
  {
    id: '800-04', level: 800,
    en: 'Production was temporarily halted while the equipment underwent routine maintenance.',
    ko: '장비가 정기 점검을 받는 동안 생산이 일시적으로 중단되었습니다.',
    keys: [['생산', '제조'], ['일시', '잠시', '잠정', '임시'], ['중단', '멈', '정지', '중지'], ['장비', '설비', '기계'], ['정기', '일상', '통상', '정례', '정상'], ['점검', '정비', '유지', '보수']],
    exprs: [
      ['undergo', '(검사·수술·변화 등을) 받다, 겪다', '과거형 underwent, 과거분사 undergone. undergo renovation(보수 공사를 하다)도 빈출.'],
      ['routine maintenance', '정기 점검', 'routine = 일상적인, 정기적인'],
    ],
    words: [['production', '생산'], ['temporarily', '일시적으로'], ['halt', '중단시키다'], ['undergo', '겪다, 받다'], ['maintenance', '유지 보수, 점검']],
  },
  {
    id: '800-05', level: 800,
    en: 'Only those who have registered in advance will be admitted to the seminar.',
    ko: '사전에 등록한 사람만 세미나에 입장할 수 있습니다.',
    keys: [['사전', '미리'], ['등록', '신청'], ['만', '뿐'], ['입장', '참석', '참가', '들어']],
    exprs: [
      ['those who ~', '~하는 사람들', '= people who. 토익에서 매우 자주 나오는 구조입니다.'],
      ['in advance', '미리, 사전에', '= beforehand, ahead of time'],
      ['be admitted to ~', '~에 입장이 허락되다', 'admit은 "인정하다" 외에 "입장을 허가하다"라는 뜻도 있습니다. (admission = 입장)'],
    ],
    words: [['register', '등록하다'], ['in advance', '미리, 사전에'], ['admit', '입장을 허락하다, 인정하다']],
  },
  {
    id: '800-06', level: 800,
    en: "The firm's success can be largely attributed to its innovative marketing strategy.",
    ko: '그 회사의 성공은 주로 혁신적인 마케팅 전략 덕분이라고 할 수 있습니다.',
    keys: [['회사', '기업'], ['성공'], ['혁신'], ['마케팅'], ['전략'], ['덕분', '때문', '기인', '원인', '덕']],
    exprs: [
      ['be attributed to ~', '~의 덕분이다, ~에 기인하다', 'attribute A to B(A를 B의 탓/덕분으로 보다)의 수동태입니다.'],
      ['largely', '주로, 대체로', '"크게"보다는 "주로"라는 의미로 쓰입니다. = mainly, mostly'],
    ],
    words: [['firm', '회사'], ['attribute A to B', 'A를 B의 덕분으로 보다'], ['largely', '주로, 대체로'], ['innovative', '혁신적인'], ['strategy', '전략']],
  },
  {
    id: '800-07', level: 800,
    en: 'In light of recent complaints, we have revised our return policy.',
    ko: '최근 접수된 불만 사항을 고려하여 반품 정책을 개정했습니다.',
    keys: [['최근'], ['불만', '항의', '민원', '불평', '컴플레인'], ['고려', '감안', '비추어', '따라', '때문', '반영'], ['반품', '환불', '교환'], ['정책', '규정', '방침'], ['개정', '수정', '변경', '바꾸', '바꿨', '개선']],
    exprs: [
      ['in light of ~', '~을 고려하여, ~에 비추어', '= considering, given'],
      ['revise', '개정하다, 수정하다', '문서·정책·계획을 고칠 때 씁니다. 명사형 revision.'],
    ],
    words: [['in light of', '~을 고려하여'], ['complaint', '불만, 항의'], ['revise', '개정하다, 수정하다'], ['return policy', '반품 정책']],
  },
  {
    id: '800-08', level: 800,
    en: 'The contract will be renewed automatically unless either party gives written notice.',
    ko: '어느 한쪽 당사자가 서면 통지를 하지 않는 한 계약은 자동으로 갱신됩니다.',
    keys: [['계약'], ['갱신', '연장'], ['자동'], ['당사자', '쪽', '측'], ['서면', '문서', '서류'], ['통지', '통보', '알리', '알려']],
    exprs: [
      ['either party', '(둘 중) 어느 한쪽 당사자', 'either + 단수명사 = 둘 중 어느 하나'],
      ['written notice', '서면 통지', '계약서에서 자주 보는 표현입니다.'],
    ],
    words: [['renew', '갱신하다'], ['automatically', '자동으로'], ['party', '(계약의) 당사자'], ['written notice', '서면 통지']],
  },
  {
    id: '800-09', level: 800,
    en: 'Profits fell short of expectations, prompting the company to reassess its pricing.',
    ko: '수익이 기대에 미치지 못하자, 회사는 가격 책정을 재검토하게 되었습니다.',
    keys: [['수익', '이익'], ['기대', '예상'], ['못 미', '미치지', '못미', '밑돌', '부족', '못했'], ['가격'], ['재검토', '재평가', '다시 검토', '재조정', '재고', '다시 평가']],
    exprs: [
      ['fall short of ~', '~에 미치지 못하다', 'fall short of expectations/the target = 기대/목표에 못 미치다'],
      [', prompting A to ~', '그 결과 A가 ~하게 되었다', '콤마 뒤 분사구문이 앞 문장의 "결과"를 나타냅니다. 앞에서부터 순서대로 번역하세요.'],
    ],
    words: [['fall short of', '~에 미치지 못하다'], ['expectation', '기대, 예상'], ['prompt', '촉발하다, ~하게 하다'], ['reassess', '재평가하다'], ['pricing', '가격 책정']],
  },
  {
    id: '800-10', level: 800,
    en: 'The keynote speaker is a renowned expert in sustainable urban development.',
    ko: '기조연설자는 지속 가능한 도시 개발 분야의 저명한 전문가입니다.',
    keys: [['기조', '주 연설', '주연설', '메인'], ['저명', '유명', '명망', '이름난'], ['전문가', '권위자'], ['지속 가능', '지속가능', '친환경'], ['도시'], ['개발']],
    exprs: [
      ['keynote speaker', '기조연설자', '컨퍼런스 안내문의 빈출 표현입니다.'],
      ['an expert in ~', '~ 분야의 전문가', '"분야의"를 넣어 번역하면 자연스럽습니다.'],
    ],
    words: [['keynote speaker', '기조연설자'], ['renowned', '저명한, 유명한'], ['expert', '전문가'], ['sustainable', '지속 가능한'], ['urban', '도시의']],
  },

  // ───────── 900 ─────────
  {
    id: '900-01', level: 900,
    en: 'Had the shipment not been delayed at customs, the client would have received the merchandise well ahead of the deadline.',
    ko: '배송품이 세관에서 지연되지 않았더라면, 고객은 마감 기한보다 훨씬 전에 상품을 받았을 것입니다.',
    keys: [['세관', '통관'], ['지연', '늦', '지체'], ['않았더라면', '않았다면', '않았으면', '않았더라도', '않았을'], ['고객', '의뢰인', '거래처', '클라이언트'], ['상품', '물품', '제품', '물건'], ['마감', '기한', '기일'], ['훨씬', '한참', '충분히', '여유']],
    exprs: [
      ['Had + 주어 + p.p., 주어 + would have p.p.', '(과거에) ~했더라면 ~했을 것이다', 'If the shipment had not been delayed에서 if를 생략하고 had를 앞으로 보낸 가정법 과거완료 도치입니다.'],
      ['well ahead of ~', '~보다 훨씬 앞서', 'well이 ahead of를 강조합니다. (well은 "훨씬"이라는 강조 부사)'],
    ],
    words: [['customs', '세관'], ['delay', '지연시키다'], ['merchandise', '상품'], ['deadline', '마감 기한'], ['ahead of', '~보다 앞서']],
  },
  {
    id: '900-02', level: 900,
    en: 'Not until the audit was completed did the discrepancies in the accounts come to light.',
    ko: '감사가 끝나고 나서야 비로소 장부상의 불일치가 드러났습니다.',
    keys: [['감사'], ['완료', '끝', '마무리', '마친', '마치'], ['나서야', '비로소', '후에야', '되어서야', '다음에야', '뒤에야'], ['불일치', '차이', '오류', '부정합', '맞지 않', '어긋'], ['장부', '계정', '회계', '계좌'], ['드러', '밝혀', '발견', '알게']],
    exprs: [
      ['Not until A did B', 'A하고 나서야 비로소 B했다', '부정어(Not until)가 문장 앞에 나와 주어-동사가 도치(did + 주어 + 동사원형)되었습니다.'],
      ['come to light', '드러나다, 밝혀지다', '= be revealed, become known'],
    ],
    words: [['audit', '회계 감사'], ['discrepancy', '불일치, 차이'], ['account', '장부, 계좌'], ['come to light', '드러나다, 밝혀지다']],
  },
  {
    id: '900-03', level: 900,
    en: 'The proposed regulations, if implemented, could have far-reaching implications for small businesses.',
    ko: '제안된 규정이 시행된다면 소규모 기업에 광범위한 영향을 미칠 수 있습니다.',
    keys: [['제안', '발의', '추진'], ['규정', '규제', '법규'], ['시행', '실행', '도입', '적용'], ['광범위', '폭넓', '지대', '큰', '막대', '파급', '상당'], ['영향', '여파'], ['소규모', '중소', '소기업', '작은', '영세']],
    exprs: [
      ['if implemented', '시행된다면', 'if (they are) implemented에서 주어+be동사를 생략한 삽입절입니다.'],
      ['have implications for ~', '~에 영향을 미치다', 'implication은 "함축" 외에 "(앞으로 미칠) 영향"이라는 뜻으로 자주 쓰입니다.'],
      ['far-reaching', '광범위한, 지대한', '멀리(far)까지 닿는(reaching) → 영향이 넓은'],
    ],
    words: [['regulation', '규정, 규제'], ['implement', '시행하다'], ['far-reaching', '광범위한, 지대한'], ['implication', '(미칠) 영향, 함축']],
  },
  {
    id: '900-04', level: 900,
    en: 'So successful was the pilot program that management decided to roll it out nationwide.',
    ko: '시범 프로그램이 매우 성공적이어서 경영진은 이를 전국으로 확대 시행하기로 결정했습니다.',
    keys: [['시범', '시험', '파일럿'], ['성공'], ['경영진', '경영', '관리자', '회사'], ['전국'], ['확대', '시행', '도입', '출시', '실시', '확장'], ['결정', '하기로']],
    exprs: [
      ['So + 형용사 + be + 주어 + that ~', '너무 ~해서 ~하다', 'The pilot program was so successful that ~ 에서 so + 형용사를 문두로 보낸 강조 도치입니다.'],
      ['roll out', '(신제품·서비스를) 출시하다, 확대 시행하다', '명사형 rollout(출시, 도입)도 자주 쓰입니다.'],
    ],
    words: [['pilot program', '시범 프로그램'], ['management', '경영진'], ['roll out', '출시하다, 확대 시행하다'], ['nationwide', '전국적으로']],
  },
  {
    id: '900-05', level: 900,
    en: 'Notwithstanding the initial setbacks, the project was completed on time and under budget.',
    ko: '초기의 차질에도 불구하고 그 프로젝트는 예정대로, 그리고 예산보다 적은 비용으로 완료되었습니다.',
    keys: [['불구', '에도'], ['초기', '처음', '초반'], ['차질', '난관', '어려움', '좌절', '문제', '실패'], ['제때', '기한', '예정대로', '제 시간', '제시간', '정시', '일정'], ['예산'], ['완료', '끝', '마무리', '마쳤', '마쳐']],
    exprs: [
      ['notwithstanding', '~에도 불구하고', 'despite의 격식체 표현입니다. 계약서·공문에 자주 나옵니다.'],
      ['on time', '제시간에, 예정대로', 'in time(늦지 않게, 시간 안에)과 구분하세요.'],
      ['under budget', '예산보다 적게', '반대말은 over budget(예산 초과).'],
    ],
    words: [['notwithstanding', '~에도 불구하고'], ['initial', '초기의'], ['setback', '차질, 좌절'], ['under budget', '예산보다 적게']],
  },
  {
    id: '900-06', level: 900,
    en: 'The committee deferred its decision pending further review of the environmental impact assessment.',
    ko: '위원회는 환경 영향 평가에 대한 추가 검토가 끝날 때까지 결정을 보류했습니다.',
    keys: [['위원회'], ['보류', '연기', '미루', '미뤘', '유보'], ['결정'], ['추가', '추후', '더'], ['검토'], ['환경'], ['영향'], ['평가']],
    exprs: [
      ['defer', '연기하다, 미루다', '= postpone, put off'],
      ['pending + 명사', '~까지, ~을 기다리는 동안', '전치사로 쓰인 pending입니다. 형용사로는 "미결의, 계류 중인".'],
      ['environmental impact assessment', '환경 영향 평가', '개발 사업 전에 실시하는 공식 절차 이름입니다.'],
    ],
    words: [['committee', '위원회'], ['defer', '연기하다, 미루다'], ['pending', '~까지, 미결의'], ['assessment', '평가'], ['impact', '영향']],
  },
  {
    id: '900-07', level: 900,
    en: 'Were it not for the generous contributions of our sponsors, this event would not be possible.',
    ko: '후원사들의 아낌없는 기부가 없다면, 이 행사는 불가능할 것입니다.',
    keys: [['후원'], ['아낌없', '관대', '너그러', '후한', '많은', '넉넉', '큰'], ['기부', '기여', '지원', '후원금', '도움'], ['없다면', '없었다면', '아니라면', '아니었다면', '없으면', '없이는', '않았다면'], ['행사', '이벤트'], ['불가능', '할 수 없', '못']],
    exprs: [
      ['Were it not for ~', '~이 없다면', 'If it were not for ~에서 if를 생략한 가정법 과거 도치. = But for ~, Without ~'],
      ['generous', '후한, 아낌없는', '금전적 기부·후원을 말할 때 자주 쓰입니다.'],
    ],
    words: [['generous', '후한, 아낌없는'], ['contribution', '기부(금), 기여'], ['sponsor', '후원자, 후원사'], ['were it not for', '~이 없다면']],
  },
  {
    id: '900-08', level: 900,
    en: 'The acquisition, which had been under negotiation for months, was finally finalized last week.',
    ko: '수개월간 협상 중이던 인수 건이 지난주에 마침내 성사되었습니다.',
    keys: [['인수'], ['협상', '교섭'], ['수개월', '몇 달', '여러 달', '몇달', '수 개월', '몇 개월', '몇개월'], ['마침내', '드디어', '결국'], ['지난주', '지난 주'], ['성사', '마무리', '확정', '타결', '완료', '체결']],
    exprs: [
      ['under negotiation', '협상 중인', 'under + 명사 = ~ 중인 (under construction 공사 중, under review 검토 중)'],
      ['had been ~ for months', '몇 달 동안 ~해 왔던', '과거완료: 지난주(과거)보다 더 이전부터 이어진 일입니다.'],
    ],
    words: [['acquisition', '인수, 취득'], ['negotiation', '협상'], ['finalize', '마무리 짓다, 확정하다']],
  },
  {
    id: '900-09', level: 900,
    en: 'Employees are required to disclose any potential conflicts of interest to their supervisors.',
    ko: '직원들은 잠재적인 이해 충돌이 있으면 이를 상사에게 알려야 합니다.',
    keys: [['직원'], ['공개', '알려', '보고', '밝혀', '신고', '알리'], ['잠재', '가능성', '생길 수'], ['이해 충돌', '이해충돌', '이해관계', '이해 상충', '이해상충'], ['상사', '관리자', '감독자', '상관', '윗사람']],
    exprs: [
      ['be required to + 동사원형', '~해야 한다', '규정 문서에서 must 대신 자주 쓰는 격식 표현입니다.'],
      ['conflict of interest', '이해 충돌', '개인의 이익과 회사의 이익이 부딪히는 상황. 복수형은 conflicts of interest.'],
    ],
    words: [['be required to', '~해야 한다'], ['disclose', '공개하다, 밝히다'], ['potential', '잠재적인'], ['conflict of interest', '이해 충돌'], ['supervisor', '상사, 감독자']],
  },
  {
    id: '900-10', level: 900,
    en: 'Given the volatility of the market, investors are advised to diversify their portfolios.',
    ko: '시장의 변동성을 고려할 때, 투자자들은 포트폴리오를 다각화하는 것이 좋습니다.',
    keys: [['고려', '감안', '볼 때', '비추어', '때문'], ['변동', '불안정', '변화'], ['시장'], ['투자자'], ['다각화', '분산', '다양화'], ['포트폴리오', '투자']],
    exprs: [
      ['Given + 명사', '~을 고려하면', '분사에서 온 전치사적 표현입니다. = considering, in light of'],
      ['be advised to + 동사원형', '~하도록 권고받다', '"~하는 것이 좋습니다", "~하시기 바랍니다"로 옮기면 자연스럽습니다.'],
    ],
    words: [['given', '~을 고려하면'], ['volatility', '변동성'], ['investor', '투자자'], ['diversify', '다각화하다'], ['portfolio', '포트폴리오, 자산 구성']],
  },
];
