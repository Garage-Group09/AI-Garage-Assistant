import com.garagegroup.garage_backend.service.NbScorer;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
public class ParityRunner {
    public static void main(String[] args) throws Exception {
        List<String> lines = Files.readAllLines(Path.of(args[0]), StandardCharsets.UTF_8);
        int n = Integer.parseInt(lines.get(0)); int index = 1;
        Map<String,Integer> vocab = new HashMap<>();
        for (int i=0;i<n;i++) vocab.put(lines.get(index++), i);
        int classes = Integer.parseInt(lines.get(index++));
        double[] priors = Arrays.stream(lines.get(index++).split(" ")).mapToDouble(Double::parseDouble).toArray();
        double[][] weights = new double[classes][];
        for (int i=0;i<classes;i++) weights[i] = Arrays.stream(lines.get(index++).split(" ")).mapToDouble(Double::parseDouble).toArray();
        for (int i=1;i<args.length;i++) {
            String text = new String(Base64.getDecoder().decode(args[i]), StandardCharsets.UTF_8);
            double[] result = NbScorer.probabilities(text,vocab,priors,weights);
            StringJoiner joiner = new StringJoiner(" ");
            for (double d : result) joiner.add(Double.toString(d));
            System.out.println(joiner);
        }
    }
}
