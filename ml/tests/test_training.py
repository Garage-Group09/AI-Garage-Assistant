import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import train
ROOT = Path(__file__).resolve().parents[2]

class TrainingTests(unittest.TestCase):
    def setUp(self):
        self.data,_ = train.load_dataset(ROOT / "ml/data/vehicle_symptoms_dataset.json")
        self.base,self.test = train.stratified_train_test_split(self.data)
    def test_fixed_split_and_metrics(self):
        self.assertEqual((len(self.base),len(self.test)),(91,21))
        result = train.evaluate(train.train_naive_bayes(self.base),self.test)
        self.assertEqual((result['accuracy'],result['macro_f1']),(0.619,0.5976))
    def test_duplicate_candidates_count_once(self):
        item={'text':'Brakes squeal harshly after rain with pedal vibration','category':'brake_system'}
        self.assertEqual(len(train.validate_candidates([item,item],self.base,self.test)),1)
    def test_heldout_overlap_rejected(self):
        with self.assertRaises(ValueError): train.validate_candidates([self.test[0]],self.base,self.test)
    def test_unknown_category_rejected(self):
        with self.assertRaises(ValueError): train.validate_candidates([{'text':'test','category':'fake'}],self.base,self.test)
    def test_training_lock_blocks_second_job(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d,'ml').mkdir()
            with train.training_lock(d):
                with self.assertRaises(RuntimeError):
                    with train.training_lock(d): pass
            self.assertFalse(Path(d,'ml/.training.lock').exists())
    def test_rejection_keeps_previous_model_and_version(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            shutil.copytree(ROOT/'ml/data',root/'ml/data')
            shutil.copytree(ROOT/'ml/models',root/'ml/models')
            target=root/'backend/src/main/resources/nb_model.json'
            target.parent.mkdir(parents=True)
            target.write_text('previous model sentinel')
            train.atomic_json(root/'ml/models/serving_model.json',{'servingVersion':'candidate_previous'})
            bad=train.evaluate(train.train_naive_bayes(self.base),self.test)
            bad.update(accuracy=0.1,macro_f1=0.1)
            with patch.object(train,'evaluate',return_value=bad), patch.object(train,'print_evaluation_report'):
                state=train.run_training(str(root))
            self.assertEqual(state['servingVersion'],'candidate_previous')
            self.assertEqual(state['status'],'REJECTED')
            self.assertEqual(target.read_text(),'previous model sentinel')
    def test_activation_and_rollback(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            shutil.copytree(ROOT/'ml/data',root/'ml/data')
            shutil.copytree(ROOT/'ml/models',root/'ml/models')
            with patch.object(train,'print_evaluation_report'):
                state=train.run_training(str(root))
            self.assertEqual(state['status'],'ACTIVATED')
            self.assertTrue((root/'ml/models'/('nb_model_'+state['servingVersion']+'.json')).exists())
            state=train.run_training(str(root),rollback=True)
            self.assertEqual(state['servingVersion'],'v1.0.0')
            active=json.loads((root/'backend/src/main/resources/nb_model.json').read_text())
            baseline=json.loads((root/'ml/models/nb_model_v1.0.0.json').read_text())
            self.assertEqual(active,baseline)
if __name__ == '__main__': unittest.main()
