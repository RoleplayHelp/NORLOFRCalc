class Coordinate {
    constructor(name, x, y, z = 0) {
        this.name = name || '';  // Tên có thể để trống
        this.x = x;
        this.y = y;
        this.z = z || 0; // Nếu z bỏ trống, mặc định là 0
    }

    distanceTo(otherCoordinate) {
        const dx = this.x - otherCoordinate.x;
        const dy = this.y - otherCoordinate.y;
        const dz = this.z - otherCoordinate.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

class CoordinateManager {
    constructor(storageKey = 'coordinates') {
        this.storageKey = storageKey;
        this.coordinates = this.loadCoordinates();
    }

    addCoordinate(coordinate) {
        this.coordinates.push(coordinate);
        this.saveCoordinates();
    }

    editCoordinate(index, updatedCoordinate) {
        this.coordinates[index] = updatedCoordinate;
        this.saveCoordinates();
    }

    removeCoordinate(index) {
        this.coordinates.splice(index, 1);
        this.saveCoordinates();
    }

    getCoordinate(index) {
        return this.coordinates[index];
    }

    getAllCoordinates() {
        return this.coordinates;
    }

    loadCoordinates() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data).map(coord => new Coordinate(coord.name, coord.x, coord.y, coord.z)) : [];
    }

    saveCoordinates() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.coordinates));
    }

    clearAllCoordinates() {
        this.coordinates = [];
        localStorage.removeItem(this.storageKey);
    }
}

class CoordinateUI {
    constructor(coordinateManager) {
        this.coordinateManager = coordinateManager;
        this.editIndex = null; // Biến để theo dõi tọa độ đang chỉnh sửa
        this.initElements();
        this.bindEvents();
        this.renderCoordinateList();
    }

    initElements() {
        this.pointNameInput = document.getElementById('point-name');
        this.xInput = document.getElementById('x-coordinate');
        this.yInput = document.getElementById('y-coordinate');
        this.zInput = document.getElementById('z-coordinate');
        this.addButton = document.getElementById('add-coordinate');
        this.coordinateList = document.getElementById('coordinate-list');
        this.startPointSelect = document.getElementById('start-point');
        this.endPointSelect = document.getElementById('end-point');
        this.waypointsContainer = document.getElementById('waypoints-container');
        this.addWaypointButton = document.getElementById('add-waypoint');
        this.calculateRouteButton = document.getElementById('calculate-route');
        this.resultDiv = document.getElementById('result');
        this.speedInput = document.getElementById('player-speed');
        this.clearStorageButton = document.getElementById('clear-storage');
    }

    bindEvents() {
        this.addButton.addEventListener('click', () => this.handleAddOrEditCoordinate());
        this.addWaypointButton.addEventListener('click', () => this.addWaypoint());
        this.calculateRouteButton.addEventListener('click', () => this.calculateRoute());
        this.clearStorageButton.addEventListener('click', () => this.clearAllCoordinates());
    }

    handleAddOrEditCoordinate() {
        const coordinatesCount = this.coordinateManager.getAllCoordinates().length;
        const defaultName = `Điểm ${coordinatesCount + 1}`;
        let name = this.pointNameInput.value || defaultName;
        const x = parseFloat(this.xInput.value);
        const y = parseFloat(this.yInput.value);
        const z = parseFloat(this.zInput.value) || 0;

        if (isNaN(x) || isNaN(y)) {
            alert('Vui lòng nhập tọa độ hợp lệ.');
            return;
        }

        // Kiểm tra xem tên có bị trùng không, nếu có thì thêm số vào cuối tên
        let uniqueName = name;
        let counter = 1;
        const allCoordinates = this.coordinateManager.getAllCoordinates();

        while (allCoordinates.some(coord => coord.name === uniqueName)) {
            uniqueName = `${name} (${counter})`;
            counter++;
        }
        
        name = uniqueName;

        const coordinate = new Coordinate(name, x, y, z);

        if (this.editIndex !== null) {
            // Chỉnh sửa tọa độ hiện tại
            this.coordinateManager.editCoordinate(this.editIndex, coordinate);
            this.editIndex = null;
            this.addButton.textContent = 'Thêm tọa độ'; // Đổi lại nút thành 'Thêm' sau khi sửa xong
        } else {
            // Thêm tọa độ mới
            this.coordinateManager.addCoordinate(coordinate);
        }

        this.clearInputs();
        this.renderCoordinateList();
    }

    handleEditCoordinate(index) {
        const coordinate = this.coordinateManager.getCoordinate(index);
        this.pointNameInput.value = coordinate.name;
        this.xInput.value = coordinate.x;
        this.yInput.value = coordinate.y;
        this.zInput.value = coordinate.z;

        this.editIndex = index; // Lưu vị trí để biết đang chỉnh sửa tọa độ nào
        this.addButton.textContent = 'Cập nhật tọa độ'; // Đổi nút thành 'Cập nhật'
    }

    handleDeleteCoordinate(index) {
        this.coordinateManager.removeCoordinate(index);
        this.renderCoordinateList();
    }

    clearInputs() {
        this.pointNameInput.value = '';
        this.xInput.value = '';
        this.yInput.value = '';
        this.zInput.value = '';
    }

    renderCoordinateList() {
        const coordinates = this.coordinateManager.getAllCoordinates();
        this.coordinateList.innerHTML = '';
        this.startPointSelect.innerHTML = '';
        this.endPointSelect.innerHTML = '';
        this.waypointsContainer.innerHTML = '';

        coordinates.forEach((coordinate, index) => {
            const li = document.createElement('li');
            li.textContent = `${coordinate.name} (${coordinate.x}, ${coordinate.y}, ${coordinate.z})`;

            // Nút sửa
            const editButton = document.createElement('button');
            editButton.textContent = 'Sửa';
            editButton.classList.add('edit-button');
            editButton.addEventListener('click', () => this.handleEditCoordinate(index));

            // Nút xóa
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Xóa';
            deleteButton.classList.add('delete-button');
            deleteButton.addEventListener('click', () => this.handleDeleteCoordinate(index));

            li.appendChild(editButton);
            li.appendChild(deleteButton);
            this.coordinateList.appendChild(li);

            const option = document.createElement('option');
            option.value = index;
            option.textContent = coordinate.name;

            this.startPointSelect.appendChild(option.cloneNode(true));
            this.endPointSelect.appendChild(option.cloneNode(true));
        });
    }

addWaypoint() {
    const coordinates = this.coordinateManager.getAllCoordinates();
    const waypointDiv = document.createElement('div'); // Tạo một div để chứa select và nút xóa
    waypointDiv.classList.add('waypoint-container'); // Thêm class cho div để căn chỉnh

    const waypointSelect = document.createElement('select');
    waypointSelect.classList.add('waypoint');
    
    coordinates.forEach((coordinate, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = coordinate.name;
        waypointSelect.appendChild(option);
    });

    // Nút xóa điểm trung gian, chỉ hiện dấu X
    const deleteWaypointButton = document.createElement('button');
    deleteWaypointButton.classList.add('waypoint-delete');
    deleteWaypointButton.innerHTML = '❌'; // Biểu tượng X đỏ
    deleteWaypointButton.addEventListener('click', () => {
        waypointDiv.remove();  // Xóa cả div chứa select và nút xóa
    });

    waypointDiv.appendChild(waypointSelect);
    waypointDiv.appendChild(deleteWaypointButton);
    this.waypointsContainer.appendChild(waypointDiv);
}



    calculateRoute() {
        const startPointIndex = this.startPointSelect.value;
        const endPointIndex = this.endPointSelect.value;
        const waypointSelects = Array.from(document.querySelectorAll('.waypoint'));

        if (!startPointIndex || !endPointIndex) {
            alert('Vui lòng chọn điểm xuất phát và điểm dừng.');
            return;
        }

        const selectedPoints = [startPointIndex, ...waypointSelects.map(select => select.value), endPointIndex];

        const speedSpd = parseFloat(this.speedInput.value);
        const isSpeedEntered = !isNaN(speedSpd) && speedSpd > 0;  // Kiểm tra xem tốc độ có được nhập hay không

        let totalDistance = 0;
        const route = selectedPoints.map(index => this.coordinateManager.getCoordinate(index).name).join(' -> ');

        for (let i = 0; i < selectedPoints.length - 1; i++) {
            const point1 = this.coordinateManager.getCoordinate(selectedPoints[i]);
            const point2 = this.coordinateManager.getCoordinate(selectedPoints[i + 1]);
            totalDistance += point1.distanceTo(point2);
        }

        let resultText = `Tuyến đường: ${route}<br>Tổng khoảng cách: ${totalDistance.toFixed(2)} mét`;

        // Chỉ tính thời gian di chuyển nếu tốc độ đã được nhập
        if (isSpeedEntered) {
            const speedInMetersPerSecond = speedSpd * 0.2;
            const timeInSeconds = totalDistance / speedInMetersPerSecond;
            const seconds = Math.floor(timeInSeconds);
            const milliseconds = Math.round((timeInSeconds - seconds) * 1000);

            resultText += `<br>Thời gian di chuyển: ${seconds} giây và ${milliseconds} mili giây.`;
        }

        this.resultDiv.innerHTML = resultText;
    }

    clearAllCoordinates() {
        this.coordinateManager.clearAllCoordinates();
        this.renderCoordinateList();
        alert('Đã xóa toàn bộ dữ liệu.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const coordinateManager = new CoordinateManager();
    new CoordinateUI(coordinateManager);
});
