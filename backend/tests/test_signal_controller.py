import pytest
from app.services.signal_controller import SignalController

def test_signal_controller_duration_calculation():
    controller = SignalController()
    
    # Ambulance override duration should be 60s
    assert controller.calculate_green_duration(vehicles=5, ambulances=1) == 60
    
    # Empty lane should return base duration 10s
    assert controller.calculate_green_duration(vehicles=0, ambulances=0) == 10
    
    # 20 vehicles should return max duration 40s
    assert controller.calculate_green_duration(vehicles=20, ambulances=0) == 40

def test_signal_controller_vip_mode():
    controller = SignalController()
    controller.set_vip_mode("lane1", duration=300)
    
    assert controller.vip_mode is True
    assert controller.traffic_state['lane1']['signal'] == 'green'
    assert controller.traffic_state['lane2']['signal'] == 'red'

    controller.disable_vip_mode()
    assert controller.vip_mode is False
