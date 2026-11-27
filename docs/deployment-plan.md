# Deployment Plan — AWS Learner Lab (Track B: Containers)

This guide outlines the reproducible steps to provision AWS infrastructure, build and push the `equipment-api` Docker image to Amazon ECR, deploy the multi-container stack on Amazon EC2, and verify end-to-end connectivity with Amazon RDS MySQL.

---

## 1. VPC & Security Groups

1. Use the existing **VPC** containing at least one **Public Subnet** (routed to an Internet Gateway) and two **Private Subnets** across different Availability Zones (required for an RDS Subnet Group).
2. Create **EC2 Security Group (`ec2-sg`)**:
   * **Inbound:**
     * `HTTP` (TCP `80`) — Source: `0.0.0.0/0`
     * `SSH` (TCP `22`) — Source: Your IP (`My IP`)
   * **Outbound:** All traffic (`0.0.0.0/0`)
3. Create **RDS Security Group (`rds-sg`)**:
   * **Inbound:**
     * `MySQL/Aurora` (TCP `3306`) — Source: **`ec2-sg`** (Security Group ID)
   * **Outbound:** All traffic (`0.0.0.0/0`)

---

## 2. Database Provisioning (Amazon RDS MySQL)

1. In the RDS Console, create a **Subnet Group** using your VPC's private subnets.
2. Create a new **MySQL** database (Free Tier template):
   * **DB instance identifier:** `equipment-db`
   * **Master username / password:** Set strong credentials (store them for `api/.env`; never commit to Git).
   * **Connectivity:** Select the VPC, your private Subnet Group, **Public access: No**, and attach **`rds-sg`**.
   * **Additional configuration -> Initial database name:** `equipment_db`
3. Wait until the status becomes **Available**, then copy the **Endpoint** (e.g., `equipment-db.xxxx.us-east-1.rds.amazonaws.com`).

---

## 3. Container Registry (Amazon ECR)

1. Open the **Amazon ECR** console and create a **Private** repository named `equipment-api`.
2. Note the repository URI: `<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/equipment-api`.
3. From your development environment (Cloud9, local machine with Learner AWS CLI credentials, or the EC2 instance), authenticate Docker, build, and push the image:

```bash
# Authenticate Docker to Amazon ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build and tag the Equipment API image
docker build -t equipment-api ./api
docker tag equipment-api:latest <ACCOUNT_ID>[.dkr.ecr.us-east-1.amazonaws.com/equipment-api:latest](https://.dkr.ecr.us-east-1.amazonaws.com/equipment-api:latest)

# Push to ECR
docker push <ACCOUNT_ID>[.dkr.ecr.us-east-1.amazonaws.com/equipment-api:latest](https://.dkr.ecr.us-east-1.amazonaws.com/equipment-api:latest)
```

---

## 4. Application Host (Amazon EC2)

1. Launch an **Amazon Linux 2023** instance (`t2.micro` or `t3.micro`):
   * **Network:** VPC -> Public Subnet -> **Auto-assign public IP: Enable**
   * **Security Group:** Attach `ec2-sg`
   * **Advanced details -> IAM instance profile:** Select **`LabInstanceProfile`** (grants EC2 permission to pull images from ECR in AWS Learner Lab).
2. SSH into the instance and install Docker, Git, and the Docker Compose v2 plugin:

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

# Install Docker Compose v2 CLI plugin
mkdir -p ~/.docker/cli-plugins
curl -SL [https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64](https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64) \
  -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
```

3. Log out and SSH back in so the `docker` group membership takes effect. Verify with `docker --version` and `docker compose version`.

---

## 5. Application Deployment

On the EC2 instance:

```bash
# 1. Clone the repository
git clone [https://github.com/](https://github.com/)<YOUR_USERNAME>/university-equipment-management.git
cd university-equipment-management

# 2. Configure database credentials
cp api/.env.example api/.env
nano api/.env
# Fill in DB_HOST (RDS endpoint), DB_USER, DB_PASSWORD, and DB_NAME=equipment_db

# 3. Authenticate EC2 with ECR using LabInstanceProfile
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# 4. Pull and start both containers
export ECR_REGISTRY=<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker compose pull
docker compose up -d

# 5. Confirm running containers and logs
docker ps
docker logs university-equipment-management-equipment-api-1
```

---

## 6. Connectivity & CRUD Verification

Run these commands from your local machine against the EC2 Public IP (all traffic goes through Nginx on port `80` to the internal API on port `3000`):

```bash
# 1. Health & RDS MySQL connectivity
curl http://<EC2_PUBLIC_IP>/health

# 2. Placeholder Web UI route
curl http://<EC2_PUBLIC_IP>/

# 3. CREATE equipment
curl -X POST http://<EC2_PUBLIC_IP>/equipment \
  -H "Content-Type: application/json" \
  -d '{"equipmentId":"EQ-001","equipmentName":"Oscilloscope","category":"Lab","brand":"Tektronix"}'

# 4. READ all equipment
curl http://<EC2_PUBLIC_IP>/equipment

# 5. UPDATE equipment (record borrowing)
curl -X PUT http://<EC2_PUBLIC_IP>/equipment/EQ-001 \
  -H "Content-Type: application/json" \
  -d '{"availability":"BORROWED","borrowerName":"Budi","borrowerId":"24/536680/TK/59554","borrowDate":"2026-11-27 10:00:00","dueDate":"2026-12-04 10:00:00"}'

# 6. DELETE equipment
curl -X DELETE http://<EC2_PUBLIC_IP>/equipment/EQ-001
```

---

## 7. Security & Cleanup Notes

* `equipment-api` uses `expose: ["3000"]` instead of `ports` in `docker-compose.yml`, ensuring port `3000` is unreachable from the public internet.
* Never commit `api/.env` or `.pem` key files to Git.
* Stop the EC2 and RDS instances when finished testing to preserve AWS Learner Lab credit budget.