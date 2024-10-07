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

    getCoordinate(index) {
        return this.coordinates[index];
    }

    updateCoordinate(index, updatedCoordinate) {
        this.coordinates[index] = updatedCoordinate;
        this.saveCoordinates();
    }

    deleteCoordinate(index) {
        this.coordinates.splice(index, 1);
        this.saveCoordinates();
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

class RouteCalculator {
    static calculateDistance(coordinates, selectedPoints) {
        let totalDistance = 0;
        for (let i = 0; i < selectedPoints.length - 1; i++) {
            const point1 = coordinates[selectedPoints[i]];
            const point2 = coordinates[selectedPoints[i + 1]];
            totalDistance += point1.distanceTo(point2);
        }
        return totalDistance;
    }

    static calculateTravelTime(distance, speedSpd) {
        const speedInMetersPerSecond = speedSpd * 0.2;
        return distance / speedInMetersPerSecond;
    }

    static formatTravelTime(timeInSeconds) {
        const seconds = Math.floor(timeInSeconds);
        const milliseconds = Math.round((timeInSeconds - seconds) * 1000);
        return { seconds, milliseconds };
    }
}

class CoordinateUI {
    constructor(coordinateManager) {
        this.coordinateManager = coordinateManager;
        this.currentEditIndex = null; // Biến theo dõi index đang chỉnh sửa
        this.initElements();
        this.loadFormState();
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
        this.startHourInput = document.getElementById('start-hour');
        this.startMinuteInput = document.getElementById('start-minute');
        this.startSecondInput = document.getElementById('start-second');
        this.startMillisecondInput = document.getElementById('start-millisecond');
    }

    bindEvents() {
        this.addButton.addEventListener('click', () => this.handleAddCoordinate());
        this.addWaypointButton.addEventListener('click', () => this.addWaypoint());
        this.calculateRouteButton.addEventListener('click', () => this.calculateRoute());
        this.clearStorageButton.addEventListener('click', () => this.clearAllCoordinates());

        this.startHourInput.addEventListener('input', () => this.validateTimeInput(this.startHourInput, 0, 23));
        this.startMinuteInput.addEventListener('input', () => this.validateTimeInput(this.startMinuteInput, 0, 59));
        this.startSecondInput.addEventListener('input', () => this.validateTimeInput(this.startSecondInput, 0, 59));
        this.startMillisecondInput.addEventListener('input', () => this.validateTimeInput(this.startMillisecondInput, 0, 999));
    }

    validateTimeInput(inputElement, min, max) {
        let value = parseInt(inputElement.value);

        if (isNaN(value)) {
            inputElement.value = min;
        } else if (value < min) {
            inputElement.value = min;
        } else if (value > max) {
            inputElement.value = max;
        }

        this.saveFormState();
    }

    handleAddCoordinate() {
        const name = this.pointNameInput.value || `Điểm ${this.coordinateManager.getAllCoordinates().length + 1}`;
        const x = parseFloat(this.xInput.value);
        const y = parseFloat(this.yInput.value);
        const z = parseFloat(this.zInput.value) || 0;

        if (isNaN(x) || isNaN(y)) {
            alert('Vui lòng nhập tọa độ hợp lệ.');
            return;
        }

        const newCoordinate = new Coordinate(name, x, y, z);

        if (this.currentEditIndex !== null) {
            // Cập nhật tọa độ khi đang trong chế độ chỉnh sửa
            this.coordinateManager.updateCoordinate(this.currentEditIndex, newCoordinate);
            this.currentEditIndex = null; // Xóa trạng thái chỉnh sửa
        } else {
            this.coordinateManager.addCoordinate(newCoordinate);
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

        this.currentEditIndex = index; // Lưu chỉ mục đang chỉnh sửa
    }

    handleDeleteCoordinate(index) {
        this.coordinateManager.deleteCoordinate(index);
        this.renderCoordinateList();
    }

    clearInputs() {
        this.pointNameInput.value = '';
        this.xInput.value = '';
        this.yInput.value = '';
        this.zInput.value = '';
        this.currentEditIndex = null; // Xóa trạng thái chỉnh sửa sau khi xóa hoặc thêm mới
    }

    renderCoordinateList() {
        const coordinates = this.coordinateManager.getAllCoordinates();
        this.coordinateList.innerHTML = '';
        this.startPointSelect.innerHTML = '';
        this.endPointSelect.innerHTML = '';

        coordinates.forEach((coordinate, index) => {
            const li = document.createElement('li');
            const coordinateItem = document.createElement('span');
            coordinateItem.textContent = `${coordinate.name} (${coordinate.x}, ${coordinate.y}, ${coordinate.z})`;
            coordinateItem.classList.add('coordinate-item');

            const buttonGroup = document.createElement('div');
            buttonGroup.classList.add('button-group');

            const editButton = document.createElement('button');
            editButton.textContent = 'Sửa';
            editButton.classList.add('edit-button');
            editButton.addEventListener('click', () => this.handleEditCoordinate(index));

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Xóa';
            deleteButton.classList.add('delete-button');
            deleteButton.addEventListener('click', () => this.handleDeleteCoordinate(index));

            buttonGroup.appendChild(editButton);
            buttonGroup.appendChild(deleteButton);
            li.appendChild(coordinateItem);
            li.appendChild(buttonGroup);
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

        // Tạo một container để chứa cả select và nút xóa
        const waypointContainer = document.createElement('div');
        waypointContainer.classList.add('waypoint-container'); // Thêm class để có thể tùy chỉnh CSS

        // Tạo dropdown cho điểm trung gian
        const waypointSelect = document.createElement('select');
        waypointSelect.classList.add('waypoint');

        coordinates.forEach((coordinate, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = coordinate.name;
            waypointSelect.appendChild(option);
        });

        // Tạo nút xóa cạnh điểm trung gian
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '❌'; // Sử dụng ký hiệu X để xóa
        deleteButton.classList.add('delete-waypoint');
        deleteButton.addEventListener('click', () => this.handleDeleteWaypoint(waypointContainer));

        // Thêm select và nút xóa vào container
        waypointContainer.appendChild(waypointSelect);
        waypointContainer.appendChild(deleteButton);

        // Thêm container vào vùng chứa điểm trung gian
        this.waypointsContainer.appendChild(waypointContainer);
        this.saveFormState();
    }

    handleDeleteWaypoint(waypointContainer) {
        this.waypointsContainer.removeChild(waypointContainer); // Xóa toàn bộ container chứa select và nút xóa
        this.saveFormState();
    }

    calculateRoute() {
        const startPointIndex = this.startPointSelect.value;
        const endPointIndex = this.endPointSelect.value;
        const waypointSelects = Array.from(document.querySelectorAll('.waypoint'));

        if (!startPointIndex || !endPointIndex) {
            alert('Vui lòng chọn điểm xuất phát và điểm dừng.');
            return;
        }

        // Lấy danh sách các điểm đã chọn: Điểm bắt đầu -> Điểm trung gian -> Điểm dừng
        const selectedPoints = [startPointIndex, ...waypointSelects.map(select => select.value), endPointIndex];
        const coordinates = this.coordinateManager.getAllCoordinates();
        const totalDistance = RouteCalculator.calculateDistance(coordinates, selectedPoints);

        // Xây dựng chuỗi tuyến đường (ví dụ: "A -> B -> C")
        const route = selectedPoints.map(index => coordinates[index].name).join(' -> ');

        let resultText = `Tuyến đường: ${route}<br>Tổng khoảng cách: ${totalDistance.toFixed(2)} mét`;

        const speedSpd = parseFloat(this.speedInput.value);
        if (!isNaN(speedSpd) && speedSpd > 0) {
            const timeInSeconds = RouteCalculator.calculateTravelTime(totalDistance, speedSpd);
            const { seconds, milliseconds } = RouteCalculator.formatTravelTime(timeInSeconds);
            resultText += `<br>Thời gian di chuyển: ${seconds} giây và ${milliseconds} mili giây.`;

            // Tính toán thời gian đến đích nếu người dùng nhập thời gian ban đầu
            const startHour = parseInt(this.startHourInput.value) || 0;
            const startMinute = parseInt(this.startMinuteInput.value) || 0;
            const startSecond = parseInt(this.startSecondInput.value) || 0;
            const startMillisecond = parseInt(this.startMillisecondInput.value) || 0;

            const totalMilliseconds = startMillisecond + (startSecond * 1000) + (startMinute * 60000) + (startHour * 3600000);

            if (totalMilliseconds > 0) {
                const finalTime = totalMilliseconds + (timeInSeconds * 1000);

                const finalDate = new Date(finalTime);
                const finalHours = finalDate.getUTCHours();
                const finalMinutes = finalDate.getUTCMinutes();
                const finalSeconds = finalDate.getUTCSeconds();
                const finalMilliseconds = finalDate.getUTCMilliseconds();

                resultText += `<br>Thời gian đến đích: ${finalHours} giờ, ${finalMinutes} phút, ${finalSeconds} giây, ${finalMilliseconds} mili giây.`;
            }
        }

        // Hiển thị kết quả
        this.resultDiv.innerHTML = resultText;
        this.saveFormState();  // Lưu trạng thái sau khi tính toán
    }


    clearAllCoordinates() {
        // Xóa tất cả dữ liệu từ coordinateManager
        this.coordinateManager.clearAllCoordinates();
        
        // Xóa toàn bộ các điểm trung gian từ DOM
        while (this.waypointsContainer.firstChild) {
            this.waypointsContainer.removeChild(this.waypointsContainer.firstChild);
        }

        // Xóa trạng thái form và localStorage
        this.clearFormState();

        // Cập nhật lại danh sách tọa độ để không còn hiển thị gì
        this.renderCoordinateList();
        alert('Đã xóa toàn bộ dữ liệu.');
    }

    clearFormState() {
        localStorage.removeItem('formState'); // Xóa toàn bộ trạng thái form từ localStorage
    }

    loadFormState() {
        const formState = JSON.parse(localStorage.getItem('formState'));
        if (formState) {
            this.startHourInput.value = formState.startHour || '';
            this.startMinuteInput.value = formState.startMinute || '';
            this.startSecondInput.value = formState.startSecond || '';
            this.startMillisecondInput.value = formState.startMillisecond || '';
            this.speedInput.value = formState.speed || '';

            if (formState.waypoints) {
                formState.waypoints.forEach(waypointValue => {
                    const coordinates = this.coordinateManager.getAllCoordinates();
                    const waypointSelect = document.createElement('select');
                    waypointSelect.classList.add('waypoint');

                    coordinates.forEach((coordinate, index) => {
                        const option = document.createElement('option');
                        option.value = index;
                        option.textContent = coordinate.name;
                        if (index === parseInt(waypointValue)) option.selected = true;
                        waypointSelect.appendChild(option);
                    });
                    this.waypointsContainer.appendChild(waypointSelect);
                });
            }

            this.startPointSelect.value = formState.startPoint || '';
            this.endPointSelect.value = formState.endPoint || '';
        }
    }

    clearFormState() {
        localStorage.removeItem('formState');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const coordinateManager = new CoordinateManager();
    new CoordinateUI(coordinateManager);
});
