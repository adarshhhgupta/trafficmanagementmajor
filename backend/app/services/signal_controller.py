from datetime import datetime, timezone
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class SignalController:
    def __init__(self):
        self.traffic_state: Dict[str, Dict[str, Any]] = {
            'lane1': {'vehicles': 0, 'ambulances': 0, 'pedestrians': 0, 'anomalies': 0, 'signal': 'red', 'duration': 0, 'density': 0.0, 'mode': 'normal', 'rtsp_status': 'connecting'},
            'lane2': {'vehicles': 0, 'ambulances': 0, 'pedestrians': 0, 'anomalies': 0, 'signal': 'red', 'duration': 0, 'density': 0.0, 'mode': 'normal', 'rtsp_status': 'connecting'},
            'lane3': {'vehicles': 0, 'ambulances': 0, 'pedestrians': 0, 'anomalies': 0, 'signal': 'red', 'duration': 0, 'density': 0.0, 'mode': 'normal', 'rtsp_status': 'connecting'},
            'lane4': {'vehicles': 0, 'ambulances': 0, 'pedestrians': 0, 'anomalies': 0, 'signal': 'red', 'duration': 0, 'density': 0.0, 'mode': 'normal', 'rtsp_status': 'connecting'},
        }
        self.current_green_lane: Optional[str] = None
        self.green_start_time: Optional[datetime] = None
        
        # VIP Control Mode
        self.vip_mode: bool = False
        self.vip_override_lane: Optional[str] = None
        self.vip_override_start: Optional[datetime] = None

        # Multi-Intersection Green Wave Coordination
        self.green_wave_active: bool = False
        self.green_wave_corridor: list = ['lane1', 'lane3']  # Main arterial corridor
        self.green_wave_start: Optional[datetime] = None

    def calculate_green_duration(self, vehicles: int, ambulances: int, pedestrians: int = 0) -> int:
        """
        Calculates dynamic green light duration.
        - Ambulance: 60s immediate override.
        - Pedestrians: minimum 15s walk window.
        - Normal: 10s base up to 40s max based on vehicle density.
        """
        if ambulances > 0:
            return 60

        base_duration = 10
        max_duration = 40

        if pedestrians > 0 and vehicles == 0:
            return 15

        if vehicles == 0:
            return base_duration

        duration = base_duration + (vehicles / 20.0) * (max_duration - base_duration)
        calculated = min(int(duration), max_duration)
        if pedestrians > 0:
            calculated = max(calculated, 15)
        return calculated

    def update_signals(self):
        """Updates signals based on current lane metrics and priority rules."""
        now = datetime.now(timezone.utc)

        # 1. VIP Override Priority
        if self.vip_mode and self.vip_override_lane:
            if self.vip_override_start:
                elapsed = (now - self.vip_override_start).total_seconds()
                if elapsed > 300:  # Max 5 min VIP override
                    self.vip_mode = False
                    self.vip_override_lane = None
                    self.vip_override_start = None
                else:
                    for lane_id in self.traffic_state:
                        if lane_id == self.vip_override_lane:
                            self.traffic_state[lane_id]['signal'] = 'green'
                            self.traffic_state[lane_id]['duration'] = max(0, 300 - int(elapsed))
                            self.traffic_state[lane_id]['mode'] = 'vip'
                        else:
                            self.traffic_state[lane_id]['signal'] = 'red'
                            self.traffic_state[lane_id]['duration'] = 0
                            self.traffic_state[lane_id]['mode'] = 'normal'
                    return

        # 2. Green Wave Multi-Intersection Coordination Priority
        if self.green_wave_active:
            if self.green_wave_start:
                elapsed = (now - self.green_wave_start).total_seconds()
                if elapsed > 120:  # 2 minute corridor green wave cycle
                    self.green_wave_active = False
                    self.green_wave_start = None
                else:
                    for lane_id in self.traffic_state:
                        if lane_id in self.green_wave_corridor:
                            self.traffic_state[lane_id]['signal'] = 'green'
                            self.traffic_state[lane_id]['duration'] = max(0, 120 - int(elapsed))
                            self.traffic_state[lane_id]['mode'] = 'green_wave'
                        else:
                            self.traffic_state[lane_id]['signal'] = 'red'
                            self.traffic_state[lane_id]['duration'] = 0
                            self.traffic_state[lane_id]['mode'] = 'normal'
                    return

        # 3. Emergency Ambulance Override
        ambulance_lanes = [l for l, s in self.traffic_state.items() if s['ambulances'] > 0]
        if ambulance_lanes:
            priority_lane = ambulance_lanes[0]
            if self.current_green_lane != priority_lane:
                if self.current_green_lane and self.current_green_lane in self.traffic_state:
                    self.traffic_state[self.current_green_lane]['signal'] = 'red'
                    self.traffic_state[self.current_green_lane]['duration'] = 0
                    self.traffic_state[self.current_green_lane]['mode'] = 'normal'

                self.current_green_lane = priority_lane
                self.traffic_state[priority_lane]['signal'] = 'green'
                self.traffic_state[priority_lane]['duration'] = self.calculate_green_duration(
                    self.traffic_state[priority_lane]['vehicles'],
                    self.traffic_state[priority_lane]['ambulances'],
                    self.traffic_state[priority_lane]['pedestrians']
                )
                self.traffic_state[priority_lane]['mode'] = 'emergency'
                self.green_start_time = now
            return

        # 4. Standard AI Adaptive Rotation Logic based on Vehicle Density
        if self.current_green_lane and self.green_start_time:
            elapsed = (now - self.green_start_time).total_seconds()
            remaining = self.traffic_state[self.current_green_lane]['duration'] - int(elapsed)

            if remaining <= 0:
                self.traffic_state[self.current_green_lane]['signal'] = 'red'
                self.traffic_state[self.current_green_lane]['duration'] = 0
                self.traffic_state[self.current_green_lane]['mode'] = 'normal'

                # Select next lane with highest density/vehicle count
                lanes_by_density = sorted(
                    self.traffic_state.items(),
                    key=lambda x: (x[1]['ambulances'], x[1]['vehicles']),
                    reverse=True
                )
                next_lane = lanes_by_density[0][0]
                self.current_green_lane = next_lane
                self.traffic_state[next_lane]['signal'] = 'green'
                self.traffic_state[next_lane]['duration'] = self.calculate_green_duration(
                    self.traffic_state[next_lane]['vehicles'],
                    self.traffic_state[next_lane]['ambulances'],
                    self.traffic_state[next_lane]['pedestrians']
                )
                self.green_start_time = now
            else:
                self.traffic_state[self.current_green_lane]['duration'] = remaining
        else:
            lanes_by_density = sorted(
                self.traffic_state.items(),
                key=lambda x: (x[1]['ambulances'], x[1]['vehicles']),
                reverse=True
            )
            first_lane = lanes_by_density[0][0]
            self.current_green_lane = first_lane
            self.traffic_state[first_lane]['signal'] = 'green'
            self.traffic_state[first_lane]['duration'] = self.calculate_green_duration(
                self.traffic_state[first_lane]['vehicles'],
                self.traffic_state[first_lane]['ambulances'],
                self.traffic_state[first_lane]['pedestrians']
            )
            self.green_start_time = now

    def set_vip_mode(self, lane_id: str, duration: int = 300):
        self.vip_mode = True
        self.vip_override_lane = lane_id
        self.vip_override_start = datetime.now(timezone.utc)
        self.update_signals()

    def disable_vip_mode(self):
        self.vip_mode = False
        self.vip_override_lane = None
        self.vip_override_start = None
        self.update_signals()

    def set_green_wave(self, active: bool = True):
        self.green_wave_active = active
        self.green_wave_start = datetime.now(timezone.utc) if active else None
        self.update_signals()

signal_controller = SignalController()
