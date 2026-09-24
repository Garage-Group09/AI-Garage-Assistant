package com.garagegroup.garage_backend;
import com.garagegroup.garage_backend.service.*;
import com.garagegroup.garage_backend.entity.ChatHistory;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
class DiagnosisLogicTest {
    @Test void unknownWordsAbstainAndHistoryPreservesComplaint() {
        NaiveBayesService nb = new NaiveBayesService(); nb.loadModel();
        assertNull(nb.predict("yes")); assertNull(nb.predict("தமிழ்"));
        ChatHistory complaint = new ChatHistory(); complaint.setSender(ChatHistory.Sender.user);
        complaint.setMessage("My brakes are squeaking when I stop");
        String context=GroqService.symptomContext("yes",List.of(complaint));
        assertEquals("brake_system",nb.predict(context));
    }
    @Test void validateCostRangesAndDoNotInventPrices() {
        RepairCostService costs=new RepairCostService();
        assertEquals("UNAVAILABLE",costs.resolveEstimate("brake_system",null,null,null).getSource());
        assertEquals("UNAVAILABLE",costs.resolveEstimate("brake_system",100.0,50.0,null).getSource());
        assertEquals("UNAVAILABLE",costs.resolveEstimate(null,Double.NaN,100.0,null).getSource());
        assertEquals("UNAVAILABLE",costs.resolveEstimate(null,0.0,Double.POSITIVE_INFINITY,null).getSource());
        assertEquals("AI_ESTIMATE",costs.resolveEstimate("brake_system",100.0,200.0,"parts and labour").getSource());
    }
}
