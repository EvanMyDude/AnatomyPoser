// Per joint TYPE (the keys of data/norms.js NORMS): what kind of joint it is,
// the restrictions a clinician most often measures, and one goniometry tip.
// Movements, norms and agonists are NOT repeated here: read NORMS[type] and
// muscles.js agonistsFor(type, movement) for those.
export const JOINTS = {
  neck: {
    name: "Neck (cervical spine)",
    kind: "multi-segment: atlanto-occipital, atlantoaxial and C2–C7 facet joints",
    restrictions: [
      "Cervical spondylosis (facet and disc degeneration) limiting extension and rotation, usually over 50",
      "Whiplash-associated disorder with muscle guarding restricting all directions in the acute phase",
      "Post-fusion stiffness after anterior cervical discectomy and fusion, most marked in rotation",
    ],
    tip: "Flexion/extension: axis at the external auditory meatus, stationary arm vertical, moving arm along the base of the nose; keep the shoulders down and the trunk still, or use an inclinometer on the head.",
  },
  spineUp: {
    name: "Thoracic spine",
    kind: "facet (zygapophyseal) and intervertebral disc joints, splinted by the rib cage",
    restrictions: [
      "Fixed kyphosis (Scheuermann's or ankylosing spondylitis) with loss of extension",
      "Costovertebral and facet osteoarthritis limiting rotation and side bending",
      "Stiffness after thoracotomy, rib fracture or spinal instrumentation",
    ],
    tip: "Thoracic motion is small, so use a tape measure (C7 to T12 skin distance gains about 2.7 cm in full flexion) or dual inclinometers rather than a goniometer.",
  },
  spineLo: {
    name: "Lumbar spine",
    kind: "facet (zygapophyseal) and intervertebral disc joints, largest ranges in flexion and extension",
    restrictions: [
      "Acute disc herniation with flexion intolerance and a lateral shift away from the painful side",
      "Facet osteoarthritis and spinal stenosis limiting extension (relieved by bending forward)",
      "Ankylosing spondylitis with progressive global loss of motion, tracked by the Schober test",
    ],
    tip: "Modified Schober: mark the midline 10 cm above and 5 cm below the line joining the PSIS; the 15 cm gap should grow by at least 5 cm in full flexion. Keep the knees straight and watch for hip substitution.",
  },
  shoulder: {
    name: "Shoulder (glenohumeral)",
    kind: "ball-and-socket",
    restrictions: [
      "Adhesive capsulitis (frozen shoulder) with the capsular pattern: external rotation lost most, then abduction, then internal rotation",
      "Rotator cuff tear or subacromial impingement with a painful arc at roughly 60–120° of abduction",
      "Glenohumeral osteoarthritis or post-arthroplasty stiffness, usually limiting external rotation and abduction",
    ],
    tip: "Axis just below the lateral acromion for flexion and abduction; stabilise the scapula with your other hand to separate glenohumeral motion (about 120°) from the scapulothoracic contribution, and keep the trunk from side-bending.",
  },
  elbow: {
    name: "Elbow (humeroulnar and humeroradial)",
    kind: "hinge",
    restrictions: [
      "Post-traumatic stiffness after fracture or dislocation, often a flexion contracture with a loss of terminal extension",
      "Heterotopic ossification after injury, burns or head trauma blocking motion mechanically",
      "Osteoarthritis or inflammatory arthritis with pain and crepitus through the range",
    ],
    tip: "Axis over the lateral epicondyle, stationary arm along the humerus toward the acromion, moving arm along the radius toward the radial styloid; measure with the forearm supinated and record any hyperextension as a negative value.",
  },
  wrist: {
    name: "Wrist (radiocarpal)",
    kind: "condyloid (ellipsoid)",
    restrictions: [
      "Stiffness after a distal radius fracture, typically losing extension and supination first",
      "Rheumatoid arthritis with synovitis, ulnar drift and reduced extension",
      "Tenosynovitis or carpal tunnel syndrome limiting motion through pain rather than a mechanical block",
    ],
    tip: "Flexion/extension: axis over the triquetrum on the ulnar side, stationary arm along the ulna, moving arm along the 5th metacarpal. Deviation: axis over the capitate on the dorsum, moving arm along the 3rd metacarpal, forearm pronated on the table.",
  },
  hip: {
    name: "Hip (acetabulofemoral)",
    kind: "ball-and-socket",
    restrictions: [
      "Osteoarthritis with the capsular pattern: internal rotation lost first, then flexion and abduction",
      "Femoroacetabular impingement with pain and a block at end-range flexion and internal rotation",
      "Post-arthroplasty precautions or capsular stiffness limiting flexion beyond 90° and adduction past midline",
    ],
    tip: "Axis over the greater trochanter, stationary arm along the trunk midline, moving arm along the femur to the lateral epicondyle; flex the opposite hip to flatten the lumbar lordosis for flexion, and for extension use the Thomas test position to catch a flexion contracture.",
  },
  knee: {
    name: "Knee (tibiofemoral)",
    kind: "modified hinge (rolls, glides and rotates slightly)",
    restrictions: [
      "Arthrofibrosis after ACL reconstruction or total knee replacement, losing terminal extension and deep flexion",
      "Osteoarthritis with effusion and a fixed flexion deformity",
      "Meniscal tear with a mechanical block to full extension (locked knee)",
    ],
    tip: "Axis over the lateral femoral epicondyle, stationary arm toward the greater trochanter, moving arm along the fibula toward the lateral malleolus; measure flexion supine with the hip flexed, and record any extension lag or hyperextension separately.",
  },
  ankle: {
    name: "Ankle (talocrural)",
    kind: "hinge (mortise)",
    restrictions: [
      "Gastrocnemius or soleus tightness (equinus) limiting dorsiflexion, common in diabetes and after prolonged immobilisation",
      "Stiffness after ankle fracture or severe sprain, often with a loss of dorsiflexion that alters gait",
      "Achilles tendon repair with protected, gradually restored dorsiflexion",
    ],
    tip: "Axis over the lateral malleolus, stationary arm along the fibula toward the fibular head, moving arm parallel to the 5th metatarsal; measure dorsiflexion with the knee bent (soleus) and again straight (gastrocnemius) to tell the two apart.",
  },
};

export const jointInfo = (type) => JOINTS[type] || null;
