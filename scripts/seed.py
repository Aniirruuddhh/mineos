import os
import random
from datetime import datetime, timedelta

import psycopg2
from faker import Faker

fake = Faker()

# --- Connect to your local PostgreSQL database ---
required_settings = ["DB_NAME", "DB_USER", "DB_PASSWORD"]
missing_settings = [setting for setting in required_settings if not os.getenv(setting)]

if missing_settings:
    missing = ", ".join(missing_settings)
    raise RuntimeError(f"Missing database environment variables: {missing}")

conn = psycopg2.connect(
    host=os.getenv("DB_HOST", "localhost"),
    port=os.getenv("DB_PORT", "5432"),
    dbname=os.environ["DB_NAME"],
    user=os.environ["DB_USER"],
    password=os.environ["DB_PASSWORD"],
)
cur = conn.cursor()

# Keep reruns safe during a demo: existing sample data is left untouched.
cur.execute("SELECT COUNT(*) FROM violations")
if cur.fetchone()[0] > 0:
    print("ℹ️ Existing MineOS data found; seed skipped.")
    cur.close()
    conn.close()
    raise SystemExit(0)

# --- STEP A: Insert 5 real coalfield mines ---
mines = [
    ("Jharia OCP-3", "BCCL", 23.7377, 86.4149),
    ("Korba EMC", "SECL", 22.3595, 82.7501),
    ("Talcher Area-2", "MCL", 20.9500, 85.2333),
    ("Singrauli NCPH", "NCL", 24.1997, 82.6752),
    ("Raniganj Colliery", "ECL", 23.6167, 87.1333),
]

mine_ids = {}
for name, subsidiary, lat, lon in mines:
    cur.execute(
        "INSERT INTO mines (name, subsidiary, latitude, longitude) VALUES (%s, %s, %s, %s) RETURNING id",
        (name, subsidiary, lat, lon)
    )
    mine_ids[name] = cur.fetchone()[0]  # save the auto-generated ID for later use

print("✅ Mines inserted:", mine_ids)

# --- STEP B: Insert users — one manager per mine, plus corporate + regulator ---
user_ids = {}
for name in mine_ids:
    manager_name = fake.name()
    cur.execute(
        "INSERT INTO users (name, email, role, mine_id) VALUES (%s, %s, %s, %s) RETURNING id",
        (manager_name, fake.email(), "manager", mine_ids[name])
    )
    user_ids[f"manager_{name}"] = cur.fetchone()[0]

# one corporate user (not tied to a specific mine)
cur.execute(
    "INSERT INTO users (name, email, role, mine_id) VALUES (%s, %s, %s, NULL) RETURNING id",
    (fake.name(), fake.email(), "corporate")
)
user_ids["corporate"] = cur.fetchone()[0]

# one regulator user
cur.execute(
    "INSERT INTO users (name, email, role, mine_id) VALUES (%s, %s, %s, NULL) RETURNING id",
    (fake.name(), fake.email(), "regulator")
)
user_ids["regulator"] = cur.fetchone()[0]

print("✅ Users inserted:", user_ids)

# --- STEP C: Insert violations — DELIBERATELY UNEVEN, this is the important part ---
# Jharia and Singrauli are our "high-risk" mines — they get many violations.
# The others get just a few. This unevenness is what makes the risk engine meaningful later.
violation_plan = {
    "Jharia OCP-3": 10,
    "Singrauli NCPH": 8,
    "Korba EMC": 4,
    "Talcher Area-2": 3,
    "Raniganj Colliery": 3,
}

categories = ["safety", "safety", "safety", "environment", "labour", "production"]
# ^ repeating "safety" 3x makes it more common, matching real-world proportions

sample_descriptions = {
    "safety": "Roof support spacing exceeds permitted limit in active panel.",
    "environment": "Dust suppression sprinkler inactive on haul road.",
    "labour": "Contractor worker registration documents incomplete.",
    "production": "Daily production log entry delayed beyond reporting window.",
}

violation_ids = []
for mine_name, count in violation_plan.items():
    for i in range(count):
        category = random.choice(categories)
        days_ago = random.randint(1, 270)  # spread across the last ~9 months
        created_date = datetime.now() - timedelta(days=days_ago)

        cur.execute(
            """INSERT INTO violations (mine_id, reported_by, category, description, status, created_at)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
            (
                mine_ids[mine_name],
                user_ids[f"manager_{mine_name}"],
                category,
                sample_descriptions[category],
                "open",  # we'll close some of these in the next step
                created_date
            )
        )
        violation_ids.append(cur.fetchone()[0])

print(f"✅ {len(violation_ids)} violations inserted")

# --- STEP D: Close about half of them with corrective actions ---
# Real compliance systems always have a backlog — not everything gets fixed.
# We deliberately leave MORE open at Jharia/Singrauli to justify their high-risk score later.
random.shuffle(violation_ids)
to_close = violation_ids[: len(violation_ids) // 2]  # close roughly half

for v_id in to_close:
    cur.execute(
        "INSERT INTO corrective_actions (violation_id, action_taken, closed_at) VALUES (%s, %s, %s)",
        (v_id, "Issue reviewed and corrected per site protocol.", datetime.now())
    )
    cur.execute("UPDATE violations SET status = 'closed', resolved_at = %s WHERE id = %s", (datetime.now(), v_id))

print(f"✅ {len(to_close)} violations closed with corrective actions")

# --- Save everything permanently ---
conn.commit()
cur.close()
conn.close()
print("🎉 Done — database seeded successfully!")
