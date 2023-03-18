### CÁCH CONFIG REPLICATE SET MONGODB
Tạo một mạng chung
```
docker network create mongoNet
docker network ls
```
Kiểm tra subnet mark
```
docker network inspect mongoNet | grep Subnet   ("Subnet": "172.18.0.0/16")
```
Tạo 3 container mongo
```
docker run -d -p 10000:27017 --net mongoNet --name r0 mongo:latest --replSet mongoRepSet
docker run -d -p 20000:27017 --net mongoNet --name r1 mongo:latest --replSet mongoRepSet
docker run -d -p 30000:27017 --net mongoNet --name r2 mongo:latest --replSet mongoRepSet
```
Kiêm tra ip address của từng container trong mạng mongoNet
```
docker inspect --format '{{ .NetworkSettings.Networks.mongoNet.IPAddress }}' mongo1
172.18.0.2
docker inspect --format '{{ .NetworkSettings.Networks.mongoNet.IPAddress }}' mongo2
172.18.0.3
docker inspect --format '{{ .NetworkSettings.Networks.mongoNet.IPAddress }}' mongo3
172.18.0.4
```
Kiêm tra ip addresscủa wsl
```
ifconfig (192.168.0.1)
```
Truy cập vào container mongo1 
```
docker exec -it mongo1 bash
```
Truy cập vào mongo
```
mongosh
```
Cấu hình cho reqlicate 
```
test> config = {
     "_id": "mongoRepSet",
     "members": [
         { "_id": 0, "host": "192.168.0.1:10000" },
         { "_id": 1, "host": "192.168.0.1:20000" },
         { "_id": 2, "host": "192.168.0.1:30000" }
     ]
}
```
Khởi tạo
```
rs.initiate(config)
```
Kiểm tra 
```
rs.status()
```
Kêt nối chuỗi (tìm primary mongo)
```
MONGO_URI=mongodb://172.26.119.55:10000/modern_ecommerce
```

![image](https://user-images.githubusercontent.com/59383987/226091245-194a02cb-5aea-4a12-a818-d819b375e80e.png)
