import hashlib
import json
import os
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

import psycopg2
from faker import Faker
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / "backend" / ".env")

fake = Faker()

required_settings = ["DB_NAME", "DB_USER", "DB_PASSWORD"]
missing_settings = [setting for setting in required_settings if not os.getenv(setting)]

if missing_settings:
    missing = ", ".join(missing_settings)
    raise RuntimeError(f"Missing database environment variables: {missing}")

conn = psycopg2.connect(
    host=os.getenv("DB_HOST", "localhost"),
    port=os.getenv("DB_PORT", "5432"),
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
)
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM violations")
if cur.fetchone()[0] > 0:
    print("ℹ️ Existing MineOS data found; seed skipped.")
    cur.close()
    conn.close()
    raise SystemExit(0)


def iso_timestamp(value):
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    else:
        value = value.astimezone(timezone.utc)
    return (
        value.strftime("%Y-%m-%dT%H:%M:%S.")
        + f"{int(value.microsecond / 1000):03d}Z"
    )


def compute_hash(previous_hash, violation_id, action, performed_by, details, created_at):
    payload = json.dumps(
        {
            "previous_hash": previous_hash,
            "violation_id": violation_id,
            "action": action,
            "performed_by": performed_by,
            "details": details,
            "created_at": created_at,
        },
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


previous_hash = "0" * 64


def write_audit(violation_id, action, performed_by, details_object, created_at):
    global previous_hash
    created_iso = iso_timestamp(created_at)
    details = json.dumps(details_object, separators=(",", ":"), ensure_ascii=False)
    entry_hash = compute_hash(
        previous_hash,
        violation_id,
        action,
        performed_by,
        details,
        created_iso,
    )
    cur.execute(
        """INSERT INTO audit_log (
             violation_id, action, performed_by, details, previous_hash, entry_hash, created_at
           ) VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        (
            violation_id,
            action,
            performed_by,
            details,
            previous_hash,
            entry_hash,
            created_iso,
        ),
    )
    previous_hash = entry_hash


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
    mine_ids[name] = cur.fetchone()[0]

print("✅ Mines inserted:", mine_ids)

user_ids = {}
for name in mine_ids:
    manager_name = fake.name()
    cur.execute(
        "INSERT INTO users (name, email, role, mine_id) VALUES (%s, %s, %s, %s) RETURNING id",
        (manager_name, fake.email(), "manager", mine_ids[name])
    )
    user_ids[f"manager_{name}"] = cur.fetchone()[0]

cur.execute(
    "INSERT INTO users (name, email, role, mine_id) VALUES (%s, %s, %s, NULL) RETURNING id",
    (fake.name(), fake.email(), "corporate")
)
user_ids["corporate"] = cur.fetchone()[0]

cur.execute(
    "INSERT INTO users (name, email, role, mine_id) VALUES (%s, %s, %s, NULL) RETURNING id",
    (fake.name(), fake.email(), "regulator")
)
user_ids["regulator"] = cur.fetchone()[0]

print("✅ Users inserted:", user_ids)

violation_plan = {
    "Jharia OCP-3": 10,
    "Singrauli NCPH": 8,
    "Korba EMC": 4,
    "Talcher Area-2": 3,
    "Raniganj Colliery": 3,
}

categories = ["safety", "safety", "safety", "environment", "labour", "production"]

sample_descriptions = {
    "safety": "Roof support spacing exceeds permitted limit in active panel.",
    "environment": "Dust suppression sprinkler inactive on haul road.",
    "labour": "Contractor worker registration documents incomplete.",
    "production": "Daily production log entry delayed beyond reporting window.",
}

corrective_note = "Issue reviewed and corrected per site protocol."
violation_ids = []
violation_mine = {}
for mine_name, count in violation_plan.items():
    for _ in range(count):
        category = random.choice(categories)
        days_ago = random.randint(1, 270)
        created_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
        reporter_id = user_ids[f"manager_{mine_name}"]

        cur.execute(
            """INSERT INTO violations (mine_id, reported_by, category, description, status, created_at)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
            (
                mine_ids[mine_name],
                reporter_id,
                category,
                sample_descriptions[category],
                "open",
                created_date
            )
        )
        v_id = cur.fetchone()[0]
        violation_ids.append(v_id)
        violation_mine[v_id] = mine_name
        write_audit(
            v_id,
            "created",
            reporter_id,
            {
                "category": category,
                "severity": "medium",
                "area": None,
                "alert_manager": False,
            },
            created_date,
        )

print(f"✅ {len(violation_ids)} violations inserted")

random.shuffle(violation_ids)
to_close = violation_ids[: len(violation_ids) // 2]

for v_id in to_close:
    mine_name = violation_mine[v_id]
    owner_id = user_ids[f"manager_{mine_name}"]
    closed_at = datetime.now(timezone.utc)
    cur.execute(
        """INSERT INTO corrective_actions (violation_id, action_taken, status, owner_id, closed_at)
           VALUES (%s, %s, 'completed', %s, %s) RETURNING id""",
        (v_id, corrective_note, owner_id, closed_at)
    )
    action_id = cur.fetchone()[0]
    write_audit(
        v_id,
        "corrective_action_created",
        owner_id,
        {"action_id": action_id, "action_taken": corrective_note},
        closed_at,
    )
    cur.execute(
        "UPDATE violations SET status = 'closed', resolved_at = %s WHERE id = %s",
        (closed_at, v_id),
    )
    write_audit(
        v_id,
        "status_changed",
        owner_id,
        {"status": "closed"},
        closed_at + timedelta(milliseconds=1),
    )

conn.commit()
cur.close()
conn.close()
print("🎉 Done — database seeded successfully!")
